<?php echo $header; ?><?php echo $column_left; ?>
<div id="content">
  <div class="page-header">
    <div class="container-fluid">
      <div class="pull-right">
        <button type="submit" form="form-medianetpay" class="btn btn-primary"><i class="fa fa-save"></i> Guardar</button>
        <a href="<?php echo $cancel; ?>" class="btn btn-default"><i class="fa fa-reply"></i> Cancelar</a>
      </div>
      <h1><?php echo $heading_title; ?></h1>
      <ul class="breadcrumb">
        <?php foreach ($breadcrumbs as $bc): ?>
        <li><a href="<?php echo $bc['href']; ?>"><?php echo $bc['text']; ?></a></li>
        <?php endforeach; ?>
      </ul>
    </div>
  </div>

  <div class="container-fluid">
    <?php if ($error_warning): ?>
    <div class="alert alert-danger"><i class="fa fa-exclamation-circle"></i> <?php echo $error_warning; ?></div>
    <?php endif; ?>

    <div class="panel panel-default">
      <div class="panel-heading"><h3 class="panel-title"><i class="fa fa-credit-card"></i> MedianetPay &mdash; Configuracion</h3></div>
      <div class="panel-body">
        <form action="<?php echo $action; ?>" method="post" enctype="multipart/form-data" id="form-medianetpay" class="form-horizontal">

          <!-- Usuario -->
          <div class="form-group required">
            <label class="col-sm-2 control-label">Usuario MedianetPay</label>
            <div class="col-sm-10">
              <input type="text" name="payment_medianetpay_username" value="<?php echo $payment_medianetpay_username; ?>" class="form-control" placeholder="usuario@comercio.com" />
              <?php if ($error_username): ?><div class="text-danger"><?php echo $error_username; ?></div><?php endif; ?>
              <p class="help-block">Su usuario de acceso a la plataforma MedianetPay.</p>
            </div>
          </div>

          <!-- Llave Webservice -->
          <div class="form-group required">
            <label class="col-sm-2 control-label">Llave Webservice</label>
            <div class="col-sm-10">
              <input type="text" name="payment_medianetpay_key_webservice" value="<?php echo $payment_medianetpay_key_webservice; ?>" class="form-control" placeholder="Llave de 36 caracteres" />
              <?php if ($error_key): ?><div class="text-danger"><?php echo $error_key; ?></div><?php endif; ?>
              <p class="help-block">Generela en: Configuracion general &rarr; Seguridad Webservice &rarr; Llave Webservice.</p>
            </div>
          </div>

          <!-- Ambiente -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Ambiente</label>
            <div class="col-sm-10">
              <select name="payment_medianetpay_sandbox" class="form-control">
                <option value="1" <?php echo ($payment_medianetpay_sandbox == '1') ? 'selected' : ''; ?>>QA / Pruebas</option>
                <option value="0" <?php echo ($payment_medianetpay_sandbox == '0') ? 'selected' : ''; ?>>Produccion (cobros reales)</option>
              </select>
            </div>
          </div>

          <!-- IVA -->
          <div class="form-group">
            <label class="col-sm-2 control-label">% IVA</label>
            <div class="col-sm-10">
              <input type="number" name="payment_medianetpay_iva" value="<?php echo $payment_medianetpay_iva; ?>" class="form-control" style="width:80px;" min="0" max="99" />
              <p class="help-block">Ecuador: 15</p>
            </div>
          </div>

          <hr>
          <h4>Estados de Orden</h4>

          <!-- Estado pendiente -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Pendiente</label>
            <div class="col-sm-10">
              <select name="payment_medianetpay_order_status_pending_id" class="form-control">
                <?php foreach ($order_statuses as $os): ?>
                <option value="<?php echo $os['order_status_id']; ?>" <?php echo ($payment_medianetpay_order_status_pending_id == $os['order_status_id']) ? 'selected' : ''; ?>><?php echo $os['name']; ?></option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>

          <!-- Estado aprobado -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Aprobado</label>
            <div class="col-sm-10">
              <select name="payment_medianetpay_order_status_approved_id" class="form-control">
                <?php foreach ($order_statuses as $os): ?>
                <option value="<?php echo $os['order_status_id']; ?>" <?php echo ($payment_medianetpay_order_status_approved_id == $os['order_status_id']) ? 'selected' : ''; ?>><?php echo $os['name']; ?></option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>

          <!-- Estado rechazado -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Rechazado</label>
            <div class="col-sm-10">
              <select name="payment_medianetpay_order_status_rejected_id" class="form-control">
                <?php foreach ($order_statuses as $os): ?>
                <option value="<?php echo $os['order_status_id']; ?>" <?php echo ($payment_medianetpay_order_status_rejected_id == $os['order_status_id']) ? 'selected' : ''; ?>><?php echo $os['name']; ?></option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>

          <hr>

          <!-- Habilitado -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Estado</label>
            <div class="col-sm-10">
              <select name="payment_medianetpay_status" class="form-control">
                <option value="1" <?php echo ($payment_medianetpay_status) ? 'selected' : ''; ?>>Habilitado</option>
                <option value="0" <?php echo (!$payment_medianetpay_status) ? 'selected' : ''; ?>>Deshabilitado</option>
              </select>
            </div>
          </div>

          <!-- Orden de clasificacion -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Orden</label>
            <div class="col-sm-10">
              <input type="number" name="payment_medianetpay_sort_order" value="<?php echo $payment_medianetpay_sort_order; ?>" class="form-control" style="width:80px;" />
            </div>
          </div>

        </form>
      </div>
    </div>
  </div>
</div>
<?php echo $footer; ?>
