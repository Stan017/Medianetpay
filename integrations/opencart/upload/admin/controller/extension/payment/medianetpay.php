<?php
/**
 * MedianetPay - Admin Controller (OpenCart)
 * Pagina de configuracion en el panel de administracion.
 */
class ControllerExtensionPaymentMedianetpay extends Controller
{
    private $error = array();

    public function index()
    {
        $this->load->language('extension/payment/medianetpay');
        $this->document->setTitle($this->language->get('heading_title'));
        $this->load->model('setting/setting');

        if (($this->request->server['REQUEST_METHOD'] == 'POST') && $this->validate()) {
            $this->model_setting_setting->editSetting('payment_medianetpay', $this->request->post);
            $this->session->data['success'] = $this->language->get('text_success');
            $this->response->redirect($this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true));
        }

        // Breadcrumbs
        $data['breadcrumbs'] = array(
            array('text' => $this->language->get('text_home'), 'href' => $this->url->link('common/dashboard', 'user_token=' . $this->session->data['user_token'], true)),
            array('text' => $this->language->get('text_extension'), 'href' => $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true)),
            array('text' => $this->language->get('heading_title'), 'href' => $this->url->link('extension/payment/medianetpay', 'user_token=' . $this->session->data['user_token'], true)),
        );

        // Mensajes de error
        $data['error_warning']     = $this->error['warning']     ?? '';
        $data['error_username']    = $this->error['username']    ?? '';
        $data['error_key']         = $this->error['key']         ?? '';

        $data['action'] = $this->url->link('extension/payment/medianetpay', 'user_token=' . $this->session->data['user_token'], true);
        $data['cancel'] = $this->url->link('marketplace/extension', 'user_token=' . $this->session->data['user_token'] . '&type=payment', true);

        // Cargar valores guardados
        $fields = array(
            'payment_medianetpay_username', 'payment_medianetpay_key_webservice',
            'payment_medianetpay_sandbox', 'payment_medianetpay_iva',
            'payment_medianetpay_order_status_pending_id',
            'payment_medianetpay_order_status_approved_id',
            'payment_medianetpay_order_status_rejected_id',
            'payment_medianetpay_status', 'payment_medianetpay_sort_order',
        );

        foreach ($fields as $field) {
            $data[$field] = $this->request->post[$field] ?? $this->config->get($field);
        }

        // Defaults
        if (is_null($data['payment_medianetpay_iva']))     $data['payment_medianetpay_iva']     = '15';
        if (is_null($data['payment_medianetpay_sandbox'])) $data['payment_medianetpay_sandbox'] = '1';

        // Cargar estados de orden
        $this->load->model('localisation/order_status');
        $data['order_statuses'] = $this->model_localisation_order_status->getOrderStatuses();

        $data['header']       = $this->load->controller('common/header');
        $data['column_left']  = $this->load->controller('common/column_left');
        $data['footer']       = $this->load->controller('common/footer');

        $this->response->setOutput($this->load->view('extension/payment/medianetpay', $data));
    }

    protected function validate()
    {
        if (!$this->user->hasPermission('modify', 'extension/payment/medianetpay')) {
            $this->error['warning'] = $this->language->get('error_permission');
        }
        if (empty($this->request->post['payment_medianetpay_username'])) {
            $this->error['username'] = $this->language->get('error_username');
        }
        if (empty($this->request->post['payment_medianetpay_key_webservice'])) {
            $this->error['key'] = $this->language->get('error_key');
        }
        return !$this->error;
    }

    public function install()
    {
        // No se requiere instalacion de tablas adicionales
    }

    public function uninstall()
    {
        // Limpiar configuracion al desinstalar
        $this->load->model('setting/setting');
        $this->model_setting_setting->deleteSetting('payment_medianetpay');
    }
}
