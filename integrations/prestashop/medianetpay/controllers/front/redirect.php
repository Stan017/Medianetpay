<?php
/**
 * Controller: redirige al cliente a la página hosted de MediaNetPay.
 *
 * Flujo:
 *  1. Cliente elige MediaNetPay en el checkout de PrestaShop
 *  2. PrestaShop llama a este controller
 *  3. Creamos un link de cobro via API
 *  4. Redirigimos al cliente a /pay/{token}
 *  5. MediaNetPay envía webhook a /module/medianetpay/webhook cuando el pago completa
 */

if (!defined('_PS_VERSION_')) exit;

class MediaNetPayRedirectModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();

        $cart    = $this->context->cart;
        $customer = new Customer($cart->id_customer);

        if (!Validate::isLoadedObject($customer)) {
            Tools::redirect('index.php?controller=order&step=1');
            return;
        }

        $currency = new Currency($cart->id_currency);
        $amount   = number_format((float) $cart->getOrderTotal(true), 2, '.', '');
        $description = sprintf(
            'Pedido PrestaShop — %s · %s',
            Configuration::get('PS_SHOP_NAME'),
            $customer->email
        );

        try {
            $link_data = $this->module->apiPost('/v1/links', [
                'amount'           => (float) $amount,
                'currency'         => 'USD',
                'description'      => $description,
                'max_uses'         => 1,
                'expires_in_hours' => 2,
            ]);
        } catch (\Exception $e) {
            $this->errors[] = 'No se pudo conectar con MediaNetPay: ' . $e->getMessage();
            $this->redirectWithNotifications($this->context->link->getPageLink('order', true, null, ['step' => 1]));
            return;
        }

        // Guardar en sesión para verificar en el webhook
        $this->context->cookie->mnp_link_id = $link_data['id'] ?? '';
        $this->context->cookie->mnp_cart_id = (int) $cart->id;
        $this->context->cookie->write();

        $return_url = $this->context->link->getModuleLink('medianetpay', 'confirmation', [], true);
        $checkout_url = ($link_data['checkout_url'] ?? '') . '?redirect_url=' . urlencode($return_url);

        Tools::redirect($checkout_url);
    }
}
