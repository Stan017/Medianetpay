<?php
/**
 * MediaNetPay — Módulo de pago para PrestaShop 1.7 / 8.x
 *
 * Instalar: subir la carpeta /medianetpay/ a /modules/ de PrestaShop
 * Luego: Módulos → Gestionar módulos → Instalar MediaNetPay
 */

if (!defined('_PS_VERSION_')) exit;

class MediaNetPay extends PaymentModule
{
    public function __construct()
    {
        $this->name            = 'medianetpay';
        $this->tab             = 'payments_gateways';
        $this->version         = '1.0.0';
        $this->author          = 'MediaNetPay';
        $this->need_instance   = 0;
        $this->ps_versions_compliancy = ['min' => '1.7', 'max' => _PS_VERSION_];
        $this->bootstrap       = true;

        parent::__construct();

        $this->displayName = 'MediaNetPay';
        $this->description = 'Acepta pagos con tarjeta via MediaNetPay. Los clientes pagan en una página segura hosted.';
    }

    // ── Instalación ───────────────────────────────────────────────────────────

    public function install()
    {
        return parent::install()
            && $this->registerHook('paymentOptions')
            && $this->registerHook('actionValidateOrder')
            && Configuration::updateValue('MNP_API_SECRET_KEY', '')
            && Configuration::updateValue('MNP_API_BASE_URL', 'https://api.medianetpay.ec')
            && Configuration::updateValue('MNP_WEBHOOK_SECRET', '');
    }

    public function uninstall()
    {
        Configuration::deleteByName('MNP_API_SECRET_KEY');
        Configuration::deleteByName('MNP_API_BASE_URL');
        Configuration::deleteByName('MNP_WEBHOOK_SECRET');
        return parent::uninstall();
    }

    // ── Configuración en el back-office ───────────────────────────────────────

    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('submit_mnp')) {
            Configuration::updateValue('MNP_API_SECRET_KEY', Tools::getValue('MNP_API_SECRET_KEY'));
            Configuration::updateValue('MNP_API_BASE_URL', rtrim(Tools::getValue('MNP_API_BASE_URL'), '/'));
            Configuration::updateValue('MNP_WEBHOOK_SECRET', Tools::getValue('MNP_WEBHOOK_SECRET'));
            $output .= $this->displayConfirmation('Configuración guardada.');
        }

        return $output . $this->renderConfigForm();
    }

    private function renderConfigForm(): string
    {
        $fields = [
            'form' => [
                'legend' => ['title' => 'Configuración MediaNetPay'],
                'input'  => [
                    [
                        'type'     => 'password',
                        'label'    => 'Clave secreta (sk_)',
                        'name'     => 'MNP_API_SECRET_KEY',
                        'required' => true,
                        'desc'     => 'Tu sk_live_... o sk_test_... del portal MediaNetPay.',
                    ],
                    [
                        'type'  => 'text',
                        'label' => 'URL de API',
                        'name'  => 'MNP_API_BASE_URL',
                        'desc'  => 'No modificar en producción.',
                    ],
                    [
                        'type'  => 'password',
                        'label' => 'Webhook Secret',
                        'name'  => 'MNP_WEBHOOK_SECRET',
                        'desc'  => 'El mismo webhook_secret de tu portal MediaNetPay.',
                    ],
                ],
                'submit' => ['title' => 'Guardar'],
            ],
        ];

        $helper                           = new HelperForm();
        $helper->module                   = $this;
        $helper->name_controller          = $this->name;
        $helper->token                    = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex             = AdminController::$currentIndex . '&configure=' . $this->name;
        $helper->default_form_language    = (int) Configuration::get('PS_LANG_DEFAULT');
        $helper->allow_employee_form_lang = (int) Configuration::get('PS_LANG_DEFAULT');
        $helper->fields_value             = [
            'MNP_API_SECRET_KEY' => Configuration::get('MNP_API_SECRET_KEY'),
            'MNP_API_BASE_URL'   => Configuration::get('MNP_API_BASE_URL') ?: 'https://api.medianetpay.ec',
            'MNP_WEBHOOK_SECRET' => Configuration::get('MNP_WEBHOOK_SECRET'),
        ];

        return $helper->generateForm([$fields]);
    }

    // ── Hook: opciones de pago en el checkout ─────────────────────────────────

    public function hookPaymentOptions($params)
    {
        if (!$this->active) return [];

        $option = new PrestaShop\PrestaShop\Core\Payment\PaymentOption();
        $option->setCallToActionText('Tarjeta de crédito / débito (MediaNetPay)')
               ->setAction($this->context->link->getModuleLink($this->name, 'redirect', [], true))
               ->setLogo(Media::getMediaPath(_PS_MODULE_DIR_ . $this->name . '/logo.png'));

        return [$option];
    }

    // ── Helper: llamada a la API ──────────────────────────────────────────────

    public function apiPost(string $path, array $body)
    {
        $base = Configuration::get('MNP_API_BASE_URL') ?: 'https://api.medianetpay.ec';
        $sk   = Configuration::get('MNP_API_SECRET_KEY');

        $ch = curl_init($base . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-API-Key: ' . $sk,
            ],
            CURLOPT_TIMEOUT        => 20,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($resp, true);
        if ($code >= 400) {
            $message = $data['detail']['message'] ?? ('Error HTTP ' . $code);
            throw new \Exception($message);
        }
        return $data;
    }
}
