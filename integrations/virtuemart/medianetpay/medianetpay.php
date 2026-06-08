<?php
/**
 * MedianetPay Payment Plugin for VirtueMart (Joomla)
 *
 * Integra la pasarela de pagos MedianetPay con VirtueMart usando
 * el modelo WebCheckout por redireccion.
 *
 * Flujo:
 *   1. Cliente confirma orden -> plgVmConfirmedOrder() -> POST a MedianetPay API -> obtiene link
 *   2. Cliente es redirigido al link de pago de MedianetPay
 *   3. MedianetPay llama a confirmation.php con el resultado (url_back)
 *   4. Cliente regresa a response via url_redirect
 *
 * @version    1.0.0
 * @author     MedianetPay
 * @license    GPL v2
 */

defined('_JEXEC') or die('Direct Access to ' . basename(__FILE__) . ' is not allowed.');

if (!class_exists('vmPSPlugin')) {
    require VMPATH_PLUGINLIBS . DS . 'vmpsplugin.php';
}

class plgVmPaymentMedianetpay extends vmPSPlugin
{
    // URL de la API de MedianetPay
    const URL_QA         = 'https://qa-api.medianetpay.ec/app/webservice/webcheckout/rest';
    const URL_PRODUCTION = 'https://api.medianetpay.ec:4443/app/webservice/webcheckout/rest';

    public function __construct(&$subject, $config)
    {
        parent::__construct($subject, $config);

        $this->_loggable   = true;
        $this->tableFields = array_keys($this->getTableSQLFields());
        $this->_tablepkey  = 'id';
        $this->_tableId    = 'id';

        $varsToPush = $this->getVarsToPush();
        $this->setConfigParameterable($this->_configTableFieldName, $varsToPush);
    }

    /**
     * Campos de configuracion del plugin en la base de datos.
     */
    public function getTableSQLFields()
    {
        $sqlFields = array(
            'id'                    => 'i unsigned NOT NULL AUTO_INCREMENT',
            'virtuemart_order_id'   => 'i unsigned',
            'order_number'          => 'char(64)',
            'virtuemart_paymentmethod_id' => 'mediumint(1) unsigned',
            'payment_name'          => 'varchar(5000)',
            'payment_order_total'   => 'decimal(15,5) NOT NULL DEFAULT \'0.00000\'',
            'payment_currency'      => 'char(3)',
            'medianet_reference'    => 'varchar(128)',
            'medianet_response'     => 'varchar(32)',
            'medianet_authorization'=> 'varchar(64)',
        );
        return $sqlFields;
    }

    /**
     * Variables de configuracion del administrador.
     */
    protected function getVarsToPush()
    {
        return array(
            'username'      => array('', 'char'),
            'key_webservice'=> array('', 'char'),
            'sandbox'       => array('1', 'int'),
            'iva'           => array('15', 'char'),
        );
    }

    /**
     * Formulario de configuracion en el administrador.
     */
    public function plgVmDeclarePluginParamsHook($classname, $method, &$render)
    {
        return $this->declarePluginParams('payment', $classname, $method, $render);
    }

    public function plgVmSetOnTablePluginParamsHook($name, $id, &$table)
    {
        return $this->setOnTablePluginParams($name, $id, $table);
    }

    /**
     * Se ejecuta cuando el cliente confirma la orden.
     * Llama a la API de MedianetPay y redirige al cliente.
     */
    public function plgVmConfirmedOrder($cart, $order)
    {
        if (!($this->_currentMethod = $this->getVmPluginMethod($order['details']['BT']->virtuemart_paymentmethod_id))) {
            return null;
        }
        if (!$this->selectedThisElement($this->_currentMethod->payment_element)) {
            return false;
        }

        $session = JFactory::getSession();
        $return_context = $session->getId();

        $orderNumber = $order['details']['BT']->order_number;
        $amount      = round((float)$order['details']['BT']->order_total, 2);
        $currency    = shopFunctions::getCurrencyByID($order['details']['BT']->order_currency, 'currency_code_3');
        $customer    = $order['details']['BT'];

        // Construir descripcion del pedido
        $description = 'Pedido ' . $orderNumber;
        if (!empty($order['items'])) {
            $items = array();
            foreach ($order['items'] as $item) {
                $items[] = $item->order_item_name;
            }
            $desc_items = implode(', ', $items);
            if (strlen($desc_items) > 185) {
                $desc_items = substr($desc_items, 0, 185) . '...';
            }
            $description = $desc_items;
        }

        // Referencia encriptada
        $reference = $this->_encryptReference($orderNumber, $this->_currentMethod->key_webservice);

        // URLs de retorno
        $url_base   = JURI::root();
        $url_back   = $url_base . 'plugins/vmpayment/medianetpay/medianetpay/confirmation.php';
        $url_redirect = $url_base . 'plugins/vmpayment/medianetpay/medianetpay/response.php?reference=' . urlencode($orderNumber);

        $params = array(
            'username'           => $this->_currentMethod->username,
            'key_webservice'     => $this->_currentMethod->key_webservice,
            'reference'          => $reference,
            'currency'           => $currency,
            'value'              => $amount,
            'iva'                => (int)$this->_currentMethod->iva,
            'value_base_not_iva' => round($amount / (1 + ((int)$this->_currentMethod->iva / 100)), 2),
            'description'        => $description,
            'url_back'           => $url_back,
            'url_redirect'       => $url_redirect,
            'person_data'        => array(
                'person_name'     => $customer->first_name,
                'person_lastname' => $customer->last_name,
                'person_email'    => $customer->email,
                'person_phone'    => $customer->phone_1,
            ),
        );

        $api_url = ($this->_currentMethod->sandbox == '1') ? self::URL_QA : self::URL_PRODUCTION;
        $result  = $this->_callMedianetAPI($api_url, $params);

        if (!$result || empty($result->link)) {
            $msg = !empty($result->message) ? $result->message : 'Error de conexion con MedianetPay.';
            vmInfo($msg);
            $mainframe = JFactory::getApplication();
            $mainframe->redirect(JRoute::_('index.php?option=com_virtuemart&view=cart'));
            return false;
        }

        // Guardar referencia en la tabla del plugin
        $this->_storePaymentData($order, $reference, $this->_currentMethod);

        // Redirigir al cliente a la pagina de pago de MedianetPay
        $mainframe = JFactory::getApplication();
        $mainframe->redirect($result->link);
        return true;
    }

    /**
     * No se usa (pago por redireccion), pero requerido por vmPSPlugin.
     */
    public function plgVmOnPaymentResponseReceived(&$html)
    {
        return null;
    }

    public function plgVmOnUserPaymentCancel()
    {
        return false;
    }

    public function plgVmDisplayListFEPayment(VirtueMartCart $cart, $selected = 0, &$htmlIn)
    {
        return $this->displayListFEPayment($cart, $selected, $htmlIn);
    }

    public function plgVmGetPaymentCurrency($virtuemart_paymentmethod_id, &$paymentCurrencyId)
    {
        if (!($method = $this->getVmPluginMethod($virtuemart_paymentmethod_id))) {
            return null;
        }
        if (!$this->selectedThisElement($method->payment_element)) {
            return false;
        }
        $this->getPaymentCurrency($method);
        $paymentCurrencyId = $method->payment_currency;
        return;
    }

    public function plgVmOnCheckAutomaticSelectedPayment(VirtueMartCart $cart, array $cart_prices = array(), &$paymentCounter)
    {
        return $this->onCheckAutomaticSelected($cart, $cart_prices, $paymentCounter);
    }

    public function plgVmOnShowOrderBEPayment($virtuemart_order_id, $virtuemart_paymentmethod_id)
    {
        if (!($this->_currentMethod = $this->getVmPluginMethod($virtuemart_paymentmethod_id))) {
            return null;
        }
        if (!$this->selectedThisElement($this->_currentMethod->payment_element)) {
            return false;
        }

        $db    = JFactory::getDbo();
        $query = $db->getQuery(true)
            ->select('*')
            ->from($this->_tablename)
            ->where('virtuemart_order_id = ' . (int)$virtuemart_order_id);
        $db->setQuery($query);
        $row = $db->loadObject();

        if (!$row) return '';

        $html  = '<table class="adminlist">';
        $html .= '<tr><th>' . JText::_('VMPAYMENT_MEDIANETPAY_REFERENCE') . '</th><td>' . htmlspecialchars($row->medianet_reference) . '</td></tr>';
        $html .= '<tr><th>' . JText::_('VMPAYMENT_MEDIANETPAY_RESPONSE') . '</th><td>' . htmlspecialchars($row->medianet_response) . '</td></tr>';
        $html .= '<tr><th>' . JText::_('VMPAYMENT_MEDIANETPAY_AUTHORIZATION') . '</th><td>' . htmlspecialchars($row->medianet_authorization) . '</td></tr>';
        $html .= '</table>';
        return $html;
    }

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

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

    private function _storePaymentData($order, $reference, $method)
    {
        $db    = JFactory::getDbo();
        $values = array(
            'virtuemart_order_id'         => (int)$order['details']['BT']->virtuemart_order_id,
            'order_number'                => $db->quote($order['details']['BT']->order_number),
            'virtuemart_paymentmethod_id' => (int)$method->virtuemart_paymentmethod_id,
            'payment_name'                => $db->quote($method->payment_name),
            'payment_order_total'         => (float)$order['details']['BT']->order_total,
            'payment_currency'            => $db->quote(shopFunctions::getCurrencyByID($order['details']['BT']->order_currency, 'currency_code_3')),
            'medianet_reference'          => $db->quote($reference),
            'medianet_response'           => $db->quote('PENDING'),
            'medianet_authorization'      => $db->quote(''),
        );

        $query = $db->getQuery(true)
            ->insert($this->_tablename)
            ->columns(array_keys($values))
            ->values(implode(',', array_values($values)));
        $db->setQuery($query);
        $db->execute();
    }
}
