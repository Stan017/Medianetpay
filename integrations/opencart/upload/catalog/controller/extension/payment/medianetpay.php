<?php
/**
 * MedianetPay Payment Controller for OpenCart
 *
 * Maneja el flujo de pago WebCheckout:
 *   index()        - muestra el boton de pago
 *   confirm()      - llama a la API y redirige al cliente
 *   confirmation() - recibe el webhook de MedianetPay (url_back)
 *   response()     - pagina de resultado para el cliente (url_redirect)
 */
class ControllerExtensionPaymentMedianetpay extends Controller
{
    const URL_QA         = 'https://qa-api.medianetpay.ec/app/webservice/webcheckout/rest';
    const URL_PRODUCTION = 'https://api.medianetpay.ec:4443/app/webservice/webcheckout/rest';

    // -----------------------------------------------------------------
    // Pantalla de pago en el checkout
    // -----------------------------------------------------------------
    public function index()
    {
        $this->load->language('extension/payment/medianetpay');
        $this->load->model('checkout/order');

        $data['button_confirm'] = $this->language->get('button_confirm');
        $data['action']         = $this->url->link('extension/payment/medianetpay/confirm', '', true);

        return $this->load->view('extension/payment/medianetpay', $data);
    }

    // -----------------------------------------------------------------
    // Llama a la API de MedianetPay y redirige
    // -----------------------------------------------------------------
    public function confirm()
    {
        $this->load->model('checkout/order');
        $this->load->language('extension/payment/medianetpay');

        $order_id = $this->session->data['order_id'];
        $order    = $this->model_checkout_order->getOrder($order_id);

        if (!$order) {
            $this->response->redirect($this->url->link('checkout/checkout', '', true));
            return;
        }

        $username      = $this->config->get('payment_medianetpay_username');
        $key_ws        = $this->config->get('payment_medianetpay_key_webservice');
        $sandbox       = $this->config->get('payment_medianetpay_sandbox');
        $iva           = (int)($this->config->get('payment_medianetpay_iva') ?: 15);

        $amount        = round((float)$order['total'], 2);
        $currency      = $order['currency_code'];
        $reference     = $this->_encryptReference((string)$order_id, $key_ws);

        // Descripcion del pedido
        $products    = $this->model_checkout_order->getOrderProducts($order_id);
        $desc_parts  = array_map(fn($p) => $p['name'], $products);
        $description = implode(', ', $desc_parts);
        if (strlen($description) > 185) {
            $description = substr($description, 0, 185) . '...';
        }
        if (!$description) {
            $description = 'Pedido #' . $order_id;
        }

        $url_back     = $this->url->link('extension/payment/medianetpay/confirmation', '', true);
        $url_redirect = $this->url->link('extension/payment/medianetpay/response', 'order_id=' . $order_id, true);

        $params = array(
            'username'           => $username,
            'key_webservice'     => $key_ws,
            'reference'          => $reference,
            'currency'           => $currency,
            'value'              => $amount,
            'iva'                => $iva,
            'value_base_not_iva' => round($amount / (1 + ($iva / 100)), 2),
            'description'        => $description,
            'url_back'           => $url_back,
            'url_redirect'       => $url_redirect,
            'person_data'        => array(
                'person_name'     => $order['firstname'],
                'person_lastname' => $order['lastname'],
                'person_email'    => $order['email'],
                'person_phone'    => $order['telephone'],
                'person_city'     => $order['payment_city'],
                'person_direction'=> $order['payment_address_1'],
            ),
        );

        $api_url = $sandbox ? self::URL_QA : self::URL_PRODUCTION;
        $result  = $this->_callMedianetAPI($api_url, $params);

        if (!$result || empty($result->link)) {
            $msg = !empty($result->message) ? $result->message : $this->language->get('error_connection');
            $this->session->data['error'] = $msg;
            $this->response->redirect($this->url->link('checkout/checkout', '', true));
            return;
        }

        // Marcar orden como procesando
        $this->model_checkout_order->addHistory($order_id, $this->config->get('payment_medianetpay_order_status_pending_id'));

        // Guardar referencia en session para verificacion
        $this->session->data['medianetpay_reference'] = $reference;

        // Redirigir al cliente a MedianetPay
        $this->response->redirect($result->link);
    }

    // -----------------------------------------------------------------
    // Webhook de MedianetPay (url_back) - llamada server-to-server
    // -----------------------------------------------------------------
    public function confirmation()
    {
        $this->load->model('checkout/order');

        $postBody = file_get_contents('php://input');
        $data     = json_decode($postBody);

        if (!$data || empty($data->reference)) {
            http_response_code(400);
            die('Invalid payload');
        }

        $key_ws    = $this->config->get('payment_medianetpay_key_webservice');
        $order_id  = $this->_decryptReference($data->reference, $key_ws);
        $response  = strtolower($data->response ?? '');

        if (!$order_id || !is_numeric($order_id)) {
            http_response_code(422);
            die('Invalid reference');
        }

        if ($response === 'aprobada') {
            $status_id = $this->config->get('payment_medianetpay_order_status_approved_id');
            $comment   = 'Pago aprobado. Autorizacion: ' . ($data->authorization ?? '') . '. Referencia MedianetPay: ' . ($data->payment_reference ?? '');
        } elseif ($response === 'rechazada') {
            $status_id = $this->config->get('payment_medianetpay_order_status_rejected_id');
            $comment   = 'Pago rechazado por MedianetPay.';
        } else {
            $status_id = $this->config->get('payment_medianetpay_order_status_pending_id');
            $comment   = 'Estado de pago pendiente.';
        }

        $this->model_checkout_order->addHistory((int)$order_id, (int)$status_id, $comment, true);

        http_response_code(200);
        die('OK');
    }

    // -----------------------------------------------------------------
    // Pagina de resultado para el cliente (url_redirect)
    // -----------------------------------------------------------------
    public function response()
    {
        $this->load->language('extension/payment/medianetpay');
        $this->load->model('checkout/order');

        $order_id = (int)($this->request->get['order_id'] ?? 0);
        $order    = $order_id ? $this->model_checkout_order->getOrder($order_id) : null;

        $data['heading_title']  = $this->language->get('heading_title');
        $data['order_id']       = $order_id;
        $data['order']          = $order;
        $data['continue']       = $this->url->link('common/home', '', true);
        $data['breadcrumbs']    = array(
            array('text' => $this->language->get('text_home'), 'href' => $this->url->link('common/home', '', true)),
            array('text' => $this->language->get('heading_title'), 'href' => ''),
        );

        $data['header']  = $this->load->controller('common/header');
        $data['footer']  = $this->load->controller('common/footer');
        $data['column_left'] = $this->load->controller('common/column_left');

        $this->response->setOutput($this->load->view('extension/payment/medianetpay_response', $data));
    }

    // -----------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------
    private function _callMedianetAPI($url, array $params)
    {
        $payload = json_encode($params);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        curl_close($ch);
        return $response ? json_decode($response) : null;
    }

    private function _encryptReference($orderNumber, $apiKey)
    {
        $result = '';
        for ($i = 0; $i < strlen($orderNumber); $i++) {
            $char    = substr($orderNumber, $i, 1);
            $keychar = substr($apiKey, ($i % strlen($apiKey)) - 1, 1);
            $char    = chr(ord($char) + ord($keychar));
            $result .= $char;
        }
        return base64_encode($result);
    }

    private function _decryptReference($reference, $apiKey)
    {
        $decoded = base64_decode($reference);
        $result  = '';
        for ($i = 0; $i < strlen($decoded); $i++) {
            $char    = substr($decoded, $i, 1);
            $keychar = substr($apiKey, ($i % strlen($apiKey)) - 1, 1);
            $char    = chr(ord($char) - ord($keychar));
            $result .= $char;
        }
        return $result;
    }
}
