<?php
/**
 * Controller: recibe webhooks de MediaNetPay.
 *
 * URL a configurar en el portal MediaNetPay:
 *   https://tu-tienda.com/module/medianetpay/webhook
 */

if (!defined('_PS_VERSION_')) exit;

class MediaNetPayWebhookModuleFrontController extends ModuleFrontController
{
    public function postProcess()
    {
        $payload    = file_get_contents('php://input');
        $sig_header = $_SERVER['HTTP_X_MEDIANETPAY_SIGNATURE'] ?? '';
        $secret     = Configuration::get('MNP_WEBHOOK_SECRET');

        // Validar firma HMAC-SHA256
        $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
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
        $link_id = $txn['payment_link_id'] ?? '';
        $txn_id  = $txn['id'] ?? '';

        // Buscar pedido por link_id en OrderMeta (si ya fue validado)
        // o procesar la orden pendiente via cart guardado en cookie
        // Implementación básica: log para auditoría
        PrestaShopLogger::addLog(
            'MediaNetPay webhook: charge.completed link_id=' . $link_id . ' txn_id=' . $txn_id,
            1,
            null,
            'MediaNetPay',
            0,
            true
        );

        http_response_code(200);
        exit('OK');
    }
}
