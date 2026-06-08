<?php
/**
 * MedianetPay - Confirmacion de pago (url_back)
 *
 * MedianetPay llama a este archivo via POST con el resultado del pago.
 * Actualiza el estado de la orden en VirtueMart.
 */

// Bootstrap de Joomla
define('_JEXEC', 1);
define('JPATH_BASE', dirname(__FILE__) . '/../../../../../..');
require_once JPATH_BASE . '/includes/defines.php';
require_once JPATH_BASE . '/includes/framework.php';

$app = JFactory::getApplication('site');
$app->initialise();

// Leer el cuerpo del POST (JSON de MedianetPay)
$postBody = file_get_contents('php://input');
$data     = json_decode($postBody);

if (!$data || empty($data->reference)) {
    http_response_code(400);
    die('Invalid payload');
}

$reference = $data->reference;
$response  = strtolower($data->response ?? ''); // "aprobada" | "rechazada"

// Obtener configuracion del plugin para desencriptar la referencia
$db    = JFactory::getDbo();
$query = $db->getQuery(true)
    ->select('params')
    ->from('#__extensions')
    ->where('element = ' . $db->quote('medianetpay'))
    ->where('folder = ' . $db->quote('vmpayment'));
$db->setQuery($query);
$paramsStr = $db->loadResult();
$params    = json_decode($paramsStr ?? '{}');
$apiKey    = $params->key_webservice ?? '';

// Desencriptar la referencia para obtener el numero de orden
$decoded = base64_decode($reference);
$orderNumber = '';
for ($i = 0; $i < strlen($decoded); $i++) {
    $char    = substr($decoded, $i, 1);
    $keychar = substr($apiKey, ($i % strlen($apiKey)) - 1, 1);
    $char    = chr(ord($char) - ord($keychar));
    $orderNumber .= $char;
}

// Buscar la orden en VirtueMart
$query = $db->getQuery(true)
    ->select('virtuemart_order_id')
    ->from('#__virtuemart_orders')
    ->where('order_number = ' . $db->quote($orderNumber));
$db->setQuery($query);
$orderId = $db->loadResult();

if (!$orderId) {
    http_response_code(404);
    die('Order not found');
}

// Actualizar estado de la orden
require_once JPATH_BASE . '/components/com_virtuemart/helpers/vmmodel.php';
$orderModel = VmModel::getModel('orders');

if ($response === 'aprobada') {
    $orderModel->updateStatusForOneOrder($orderId, array('order_status' => 'C'), true); // C = Confirmed
    $newStatus = 'APROBADA';
} elseif ($response === 'rechazada') {
    $orderModel->updateStatusForOneOrder($orderId, array('order_status' => 'X'), true); // X = Cancelled
    $newStatus = 'RECHAZADA';
} else {
    $orderModel->updateStatusForOneOrder($orderId, array('order_status' => 'P'), true); // P = Pending
    $newStatus = 'PENDIENTE';
}

// Actualizar tabla del plugin con la respuesta de MedianetPay
$query = $db->getQuery(true)
    ->update('#__virtuemart_payment_plg_medianetpay')
    ->set('medianet_response = ' . $db->quote($newStatus))
    ->set('medianet_authorization = ' . $db->quote($data->authorization ?? ''))
    ->where('virtuemart_order_id = ' . (int)$orderId);
$db->setQuery($query);
$db->execute();

http_response_code(200);
echo 'OK';
