<?php
/**
 * Plugin Name:  MediaNetPay for WooCommerce
 * Plugin URI:   https://medianetpay.ec
 * Description:  Acepta pagos con MediaNetPay en tu tienda WooCommerce.
 *               El cliente es redirigido a una página de pago segura hosted.
 * Version:      1.0.0
 * Author:       MediaNetPay
 * License:      MIT
 * Text Domain:  medianetpay
 * Requires PHP: 7.4
 * WC requires at least: 6.0
 * WC tested up to: 9.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Verificar que WooCommerce esté activo antes de cargar la gateway.
 */
add_action('plugins_loaded', 'medianetpay_wc_init');

function medianetpay_wc_init()
{
    if (!class_exists('WC_Payment_Gateway')) {
        add_action('admin_notices', function () {
            echo '<div class="error"><p><strong>MediaNetPay</strong> requiere WooCommerce activo.</p></div>';
        });
        return;
    }

    class WC_MediaNetPay_Gateway extends WC_Payment_Gateway
    {
        /** @var string */
        private $api_secret_key;
        /** @var string */
        private $api_base_url;
        /** @var string */
        private $webhook_secret;

        public function __construct()
        {
            $this->id                 = 'medianetpay';
            $this->method_title       = 'MediaNetPay';
            $this->method_description = 'Pago seguro con tarjeta via MediaNetPay. El cliente es redirigido a una página de pago hosted.';
            $this->has_fields         = false;
            $this->supports           = ['products', 'refunds'];

            $this->init_form_fields();
            $this->init_settings();

            $this->title          = $this->get_option('title', 'Tarjeta de crédito / débito');
            $this->description    = $this->get_option('description', 'Pago 100% seguro con MediaNetPay.');
            $this->api_secret_key = $this->get_option('api_secret_key', '');
            $this->api_base_url   = rtrim($this->get_option('api_base_url', 'https://api.medianetpay.ec'), '/');
            $this->webhook_secret = $this->get_option('webhook_secret', '');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
            add_action('woocommerce_api_medianetpay', [$this, 'handle_webhook']);
        }

        // ── Configuración en el panel de WooCommerce ──────────────────────────

        public function init_form_fields()
        {
            $this->form_fields = [
                'enabled' => [
                    'title'   => 'Activar',
                    'type'    => 'checkbox',
                    'default' => 'yes',
                ],
                'title' => [
                    'title'   => 'Título visible al cliente',
                    'type'    => 'text',
                    'default' => 'Tarjeta de crédito / débito',
                ],
                'description' => [
                    'title'   => 'Descripción',
                    'type'    => 'textarea',
                    'default' => 'Pago 100% seguro con MediaNetPay.',
                ],
                'api_secret_key' => [
                    'title'       => 'Clave secreta (sk_)',
                    'type'        => 'password',
                    'description' => 'Tu sk_live_... o sk_test_... del portal MediaNetPay.',
                ],
                'api_base_url' => [
                    'title'       => 'URL de API',
                    'type'        => 'text',
                    'default'     => 'https://api.medianetpay.ec',
                    'description' => 'No modificar en producción.',
                ],
                'webhook_secret' => [
                    'title'       => 'Webhook Secret',
                    'type'        => 'password',
                    'description' => 'El mismo webhook_secret de tu portal MediaNetPay. Requerido para confirmar pedidos automáticamente.',
                ],
            ];
        }

        // ── Proceso de pago ───────────────────────────────────────────────────

        public function process_payment($order_id)
        {
            $order       = wc_get_order($order_id);
            $amount      = number_format((float) $order->get_total(), 2, '.', '');
            $description = sprintf(
                'Pedido #%s — %s',
                $order->get_order_number(),
                get_bloginfo('name')
            );

            // Crear link de cobro de uso único via MediaNetPay API
            $response = $this->api_post('/v1/links', [
                'amount'           => (float) $amount,
                'currency'         => 'USD',
                'description'      => $description,
                'max_uses'         => 1,
                'expires_in_hours' => 2,
            ]);

            if (is_wp_error($response)) {
                wc_add_notice(
                    'No se pudo conectar con el procesador de pagos: ' . $response->get_error_message(),
                    'error'
                );
                return null;
            }

            // Guardar IDs en meta del pedido
            $order->update_meta_data('_medianetpay_link_id', $response['id'] ?? '');
            $order->update_meta_data('_medianetpay_token', $response['token'] ?? '');
            $order->update_status('pending', 'Esperando confirmación de pago MediaNetPay.');
            $order->save();

            // Redirigir al checkout hosted con URL de retorno
            $return_url   = $this->get_return_url($order);
            $checkout_url = ($response['checkout_url'] ?? '')
                . '?redirect_url=' . urlencode($return_url);

            return [
                'result'   => 'success',
                'redirect' => $checkout_url,
            ];
        }

        // ── Reembolsos ────────────────────────────────────────────────────────

        public function process_refund($order_id, $amount = null, $reason = '')
        {
            $order  = wc_get_order($order_id);
            $txn_id = $order->get_meta('_medianetpay_transaction_id');

            if (empty($txn_id)) {
                return new WP_Error(
                    'no_transaction',
                    'No se encontró el ID de transacción MediaNetPay. Reembolsa manualmente desde el portal.'
                );
            }

            $response = $this->api_post('/v1/refunds', [
                'transaction_id' => $txn_id,
                'amount'         => (float) number_format((float) $amount, 2, '.', ''),
                'reason'         => $reason ?: 'Reembolso desde WooCommerce',
            ]);

            if (is_wp_error($response)) {
                return $response;
            }

            $order->add_order_note(
                'Reembolso procesado via MediaNetPay. ID: ' . ($response['id'] ?? 'N/A')
            );
            return true;
        }

        // ── Webhook ───────────────────────────────────────────────────────────

        public function handle_webhook()
        {
            $payload   = file_get_contents('php://input');
            $sig_header = $_SERVER['HTTP_X_MEDIANETPAY_SIGNATURE'] ?? '';

            // Validar firma HMAC-SHA256
            $expected = 'sha256=' . hash_hmac('sha256', $payload, $this->webhook_secret);
            if (!hash_equals($expected, $sig_header)) {
                http_response_code(401);
                exit('Firma inválida');
            }

            $event = json_decode($payload, true);
            if (empty($event) || ($event['event'] ?? '') !== 'charge.completed') {
                http_response_code(200);
                exit('OK');
            }

            $txn     = $event['data'] ?? [];
            $txn_id  = $txn['id'] ?? '';
            $link_id = $txn['payment_link_id'] ?? '';

            // Buscar el pedido por link_id
            $orders = wc_get_orders([
                'meta_key'   => '_medianetpay_link_id',
                'meta_value' => $link_id,
                'limit'      => 1,
            ]);

            if (!empty($orders)) {
                /** @var WC_Order $order */
                $order = $orders[0];
                if ($order->get_status() === 'pending') {
                    $order->payment_complete($txn_id);
                    $order->update_meta_data('_medianetpay_transaction_id', $txn_id);
                    $order->add_order_note(
                        'Pago confirmado por MediaNetPay. Ref: ' . ($txn['medianet_ref'] ?? 'N/A')
                    );
                    $order->save();
                }
            }

            http_response_code(200);
            exit('OK');
        }

        // ── Helper HTTP ───────────────────────────────────────────────────────

        private function api_post(string $path, array $body)
        {
            $response = wp_remote_post($this->api_base_url . $path, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-API-Key'    => $this->api_secret_key,
                ],
                'body'    => wp_json_encode($body),
                'timeout' => 20,
            ]);

            if (is_wp_error($response)) {
                return $response;
            }

            $code = wp_remote_retrieve_response_code($response);
            $data = json_decode(wp_remote_retrieve_body($response), true);

            if ($code >= 400) {
                $message = $data['detail']['message'] ?? ('Error HTTP ' . $code);
                return new WP_Error('medianetpay_api_error', $message);
            }

            return $data;
        }
    } // class WC_MediaNetPay_Gateway

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_MediaNetPay_Gateway';
        return $gateways;
    });
}

/**
 * Configurar URL del webhook en el panel de WooCommerce:
 *   https://tu-tienda.com/?wc-api=medianetpay
 *
 * Configurar esa misma URL en el portal MediaNetPay → Configuración → Webhook.
 */
