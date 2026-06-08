<?php
/**
 * MedianetPay - Pagina de resultado (url_redirect)
 *
 * El cliente llega aqui despues de completar o cancelar el pago.
 * Muestra el estado de la transaccion.
 */

define('_JEXEC', 1);
define('JPATH_BASE', dirname(__FILE__) . '/../../../../../..');
require_once JPATH_BASE . '/includes/defines.php';
require_once JPATH_BASE . '/includes/framework.php';

$app = JFactory::getApplication('site');
$app->initialise();

$orderNumber = JRequest::getString('reference', '');
$db          = JFactory::getDbo();

// Buscar estado de la transaccion
$status        = 'PENDIENTE';
$authorization = '';

if ($orderNumber) {
    $query = $db->getQuery(true)
        ->select('vo.virtuemart_order_id, plg.medianet_response, plg.medianet_authorization, vo.order_total')
        ->from('#__virtuemart_orders AS vo')
        ->join('LEFT', '#__virtuemart_payment_plg_medianetpay AS plg ON vo.virtuemart_order_id = plg.virtuemart_order_id')
        ->where('vo.order_number = ' . $db->quote($orderNumber));
    $db->setQuery($query);
    $row = $db->loadObject();

    if ($row) {
        $status        = $row->medianet_response ?? 'PENDIENTE';
        $authorization = $row->medianet_authorization ?? '';
        $total         = $row->order_total ?? 0;
    }
}

$isApproved = ($status === 'APROBADA');
$isRejected = ($status === 'RECHAZADA');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultado del pago - MedianetPay</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 480px; width: 100%; overflow: hidden; }
        .card-header { padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
        .card-header h2 { font-size: 16px; color: #374151; font-weight: 600; }
        .card-body { padding: 28px; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 13px; color: #6b7280; }
        .value { font-size: 14px; color: #111827; font-weight: 500; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .badge-success { background: #d1fae5; color: #065f46; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-error   { background: #fee2e2; color: #991b1b; }
        .card-footer { padding: 16px 28px; background: #f9fafb; font-size: 12px; color: #6b7280; line-height: 1.5; }
        .logo { height: 32px; }
        .btn { display: inline-block; margin-top: 20px; padding: 10px 24px; border-radius: 8px; background: #003865; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-header">
            <h2><?= $isApproved ? 'Pago exitoso' : ($isRejected ? 'Pago rechazado' : 'Resultado del pago') ?></h2>
            <img class="logo" src="<?= JURI::root() ?>plugins/vmpayment/medianetpay/medianetpay/img/logo.png" alt="MedianetPay">
        </div>
        <div class="card-body">
            <div class="row">
                <span class="label">Estado</span>
                <span class="badge <?= $isApproved ? 'badge-success' : ($isRejected ? 'badge-error' : 'badge-warning') ?>">
                    <?= $isApproved ? 'Aprobado' : ($isRejected ? 'Rechazado' : 'Pendiente') ?>
                </span>
            </div>
            <?php if ($orderNumber): ?>
            <div class="row">
                <span class="label">Numero de orden</span>
                <span class="value"><?= htmlspecialchars($orderNumber) ?></span>
            </div>
            <?php endif; ?>
            <?php if ($authorization): ?>
            <div class="row">
                <span class="label">Autorizacion</span>
                <span class="value"><?= htmlspecialchars($authorization) ?></span>
            </div>
            <?php endif; ?>
            <?php if (!empty($total)): ?>
            <div class="row">
                <span class="label">Total pagado</span>
                <span class="value">USD <?= number_format((float)$total, 2) ?></span>
            </div>
            <?php endif; ?>
            <a class="btn" href="<?= JURI::root() ?>">Volver a la tienda</a>
        </div>
        <div class="card-footer">
            <?php if ($isApproved): ?>
                Su pago ha sido procesado exitosamente. Recibira una confirmacion en su correo electronico.
            <?php elseif ($isRejected): ?>
                Su pago no pudo ser procesado. Por favor verifique sus datos e intente nuevamente.
            <?php else: ?>
                Su pago esta siendo verificado. Le notificaremos cuando sea confirmado.
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
