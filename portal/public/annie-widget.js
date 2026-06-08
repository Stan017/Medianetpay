/**
 * Annie Widget — Asistente virtual de MediaNetPay
 *
 * Uso:
 *   <script src="/static/annie-widget.js"
 *           data-api-url="http://localhost:8000">
 *   </script>
 *
 * En producción apunta al backend real:
 *   data-api-url="https://api.medianetpay.ec"
 */
(function () {
  "use strict";

  // ── Configuración ──────────────────────────────────────────────────────────
  var scriptEl = document.currentScript ||
    Array.from(document.querySelectorAll("script")).pop();
  var API_URL = (scriptEl && scriptEl.getAttribute("data-api-url")) ||
    (window.location.protocol + "//" + window.location.hostname + ":8000");
  // Los assets (imágenes) se sirven desde el mismo directorio que el script,
  // no desde el backend de API. Así Annie aparece aunque el backend no esté up.
  var scriptSrc = (scriptEl && scriptEl.src) || "";
  var ASSETS_BASE = scriptSrc
    ? scriptSrc.substring(0, scriptSrc.lastIndexOf("/"))
    : API_URL + "/static";

  var NAVY   = "#003358";
  var ORANGE = "#F89937";
  var GRAY   = "#F3F4F6";
  var DARK   = "#111827";

  // ── Estado ─────────────────────────────────────────────────────────────────
  var history = [];   // [{role, content}, ...]
  var isOpen  = false;
  var isTyping = false;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function esc(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style") {
          Object.assign(node.style, attrs[k]);
        } else if (k === "class") {
          node.className = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      if (typeof children === "string") {
        node.innerHTML = children;
      } else if (Array.isArray(children)) {
        children.forEach(function (c) {
          if (c == null) return;
          node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        });
      } else {
        node.appendChild(children);
      }
    }
    return node;
  }

  // ── Estilos ────────────────────────────────────────────────────────────────
  var css = [
    /* FAB (botón flotante) */
    "#annie-fab{position:fixed;bottom:20px;right:20px;z-index:9998;",
    "width:83px;height:83px;border-radius:50%;border:none;cursor:pointer;",
    "background:transparent;",
    "filter:drop-shadow(0 4px 10px rgba(0,0,0,.22));",
    "padding:0;",
    "transition:transform .2s,filter .2s;}",
    "#annie-fab:hover{transform:scale(1.1);filter:drop-shadow(0 6px 16px rgba(0,0,0,.28));}",
    "#annie-fab img{width:83px;height:83px;object-fit:contain;display:block;}",

    /* Pop-up bubble */
    "#annie-bubble{position:fixed;bottom:62px;right:114px;z-index:9997;",
    "background:" + ORANGE + ";border-radius:16px 16px 4px 16px;",
    "box-shadow:0 4px 20px rgba(248,153,55,.35);",
    "padding:10px 36px 10px 14px;max-width:210px;",
    "font-size:13px;font-weight:700;color:#fff;line-height:1.45;",
    "transform:translateX(10px);opacity:0;pointer-events:none;",
    "transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s;}",
    "#annie-bubble.ab-show{transform:translateX(0);opacity:1;pointer-events:all;}",
    "#annie-bubble-x{position:absolute;top:6px;right:8px;background:none;border:none;",
    "cursor:pointer;color:rgba(255,255,255,.75);font-size:15px;line-height:1;padding:2px 4px;border-radius:4px;}",
    "#annie-bubble-x:hover{color:#fff;}",

    /* Ventana de chat */
    "#annie-window{position:fixed;bottom:116px;right:20px;z-index:9999;",
    "width:360px;max-width:calc(100vw - 32px);",
    "background:#fff;border-radius:20px;",
    "box-shadow:0 12px 48px rgba(0,0,0,.15);",
    "display:flex;flex-direction:column;overflow:hidden;",
    "transform:scale(.92) translateY(12px);opacity:0;",
    "pointer-events:none;",
    "transition:transform .22s cubic-bezier(.4,0,.2,1),opacity .22s;}",
    "#annie-window.annie-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}",

    /* Header */
    "#annie-header{background:" + NAVY + ";padding:14px 18px;display:flex;align-items:center;gap:10px;}",
    "#annie-avatar{width:36px;height:36px;border-radius:50%;background:" + ORANGE + ";",
    "display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;",
    "flex-shrink:0;}",
    "#annie-info{flex:1;}",
    "#annie-name{color:#fff;font-weight:700;font-size:14px;line-height:1.2;}",
    "#annie-status{color:rgba(255,255,255,.6);font-size:11px;}",
    "#annie-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.7);",
    "font-size:20px;line-height:1;padding:2px 4px;border-radius:6px;}",
    "#annie-close:hover{color:#fff;}",

    /* Mensajes */
    "#annie-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;",
    "max-height:360px;min-height:200px;background:#fafafa;}",
    ".annie-msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.5;",
    "word-break:break-word;animation:annie-pop .18s ease;}",
    "@keyframes annie-pop{from{transform:scale(.95);opacity:.5}to{transform:scale(1);opacity:1}}",
    ".annie-msg.user{align-self:flex-end;background:" + NAVY + ";color:#fff;border-bottom-right-radius:4px;}",
    ".annie-msg.bot{align-self:flex-start;background:#fff;color:" + DARK + ";",
    "border:1px solid #E5E7EB;border-bottom-left-radius:4px;}",

    /* Typing indicator */
    "#annie-typing{display:none;align-self:flex-start;padding:10px 14px;",
    "background:#fff;border:1px solid #E5E7EB;border-radius:16px;border-bottom-left-radius:4px;}",
    "#annie-typing.show{display:flex;gap:4px;align-items:center;}",
    ".annie-dot{width:7px;height:7px;border-radius:50%;background:#9CA3AF;",
    "animation:annie-bounce 1.2s ease infinite;}",
    ".annie-dot:nth-child(2){animation-delay:.2s}",
    ".annie-dot:nth-child(3){animation-delay:.4s}",
    "@keyframes annie-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}",

    /* Input */
    "#annie-footer{padding:12px;border-top:1px solid #E5E7EB;display:flex;gap:8px;background:#fff;}",
    "#annie-input{flex:1;padding:10px 14px;border:1px solid #E5E7EB;border-radius:24px;",
    "font-size:13px;outline:none;resize:none;font-family:inherit;line-height:1.4;",
    "max-height:80px;overflow-y:auto;}",
    "#annie-input:focus{border-color:" + NAVY + ";}",
    "#annie-send{width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;",
    "background:" + NAVY + ";color:#fff;display:flex;align-items:center;justify-content:center;",
    "flex-shrink:0;transition:background .15s;}",
    "#annie-send:hover{background:" + ORANGE + ";}",
    "#annie-send:disabled{opacity:.4;cursor:not-allowed;}",
    "#annie-send svg{width:16px;height:16px;fill:#fff;}",

    /* Error */
    ".annie-error{color:#DC2626;font-size:12px;padding:6px 10px;background:#FEF2F2;",
    "border-radius:8px;border:1px solid #FECACA;}",
  ].join("");

  var styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ── DOM ────────────────────────────────────────────────────────────────────

  // Botón flotante — imagen de Annie con sombra ligera
  var fab = el("button", { id: "annie-fab", "aria-label": "Abrir chat Annie" },
    '<img src="' + ASSETS_BASE + '/annie.png" alt="Annie" draggable="false">'
  );

  // Ventana
  var messagesDiv = el("div", { id: "annie-messages" });
  var typingDiv   = el("div", { id: "annie-typing" }, [
    el("span", { class: "annie-dot" }),
    el("span", { class: "annie-dot" }),
    el("span", { class: "annie-dot" }),
  ]);
  messagesDiv.appendChild(typingDiv);

  var input = el("textarea", {
    id: "annie-input",
    placeholder: "Escribe tu pregunta...",
    rows: "1",
    "aria-label": "Mensaje para Annie",
  });

  var sendBtn = el("button", { id: "annie-send", "aria-label": "Enviar" },
    '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
  );

  var window_ = el("div", { id: "annie-window", role: "dialog", "aria-label": "Chat con Annie" }, [
    el("div", { id: "annie-header" }, [
      el("div", { id: "annie-avatar" }, "A"),
      el("div", { id: "annie-info" }, [
        el("div", { id: "annie-name" }, "Annie"),
        el("div", { id: "annie-status" }, "Asistente MediaNetPay"),
      ]),
      el("button", { id: "annie-close", "aria-label": "Cerrar chat" }, "✕"),
    ]),
    messagesDiv,
    el("div", { id: "annie-footer" }, [input, sendBtn]),
  ]);

  // Pop-up bubble
  var bubble = el("div", { id: "annie-bubble" }, [
    el("button", { id: "annie-bubble-x", "aria-label": "Cerrar sugerencia" }, "✕"),
    "¿Quieres cobrar con tarjeta en tu negocio? 🚀 ¡Cuéntame y te ayudo a empezar hoy!",
  ]);

  document.body.appendChild(window_);
  document.body.appendChild(bubble);
  document.body.appendChild(fab);

  // Mostrar bubble después de 2.5 s (solo una vez por sesión)
  var bubbleDismissed = false;
  function hideBubble() {
    bubbleDismissed = true;
    bubble.classList.remove("ab-show");
  }
  setTimeout(function () {
    if (!bubbleDismissed && !isOpen) bubble.classList.add("ab-show");
  }, 2500);

  document.getElementById("annie-bubble-x").addEventListener("click", function (e) {
    e.stopPropagation();
    hideBubble();
  });
  // Click en bubble = abrir chat
  bubble.addEventListener("click", function () {
    hideBubble();
    if (!isOpen) toggleWindow();
  });

  // Mensaje de bienvenida
  appendMessage("bot",
    "¡Hola! Soy Annie 👋 ¿En qué puedo ayudarte hoy?\n" +
    "Puedo contarte sobre nuestros planes, integraciones y cómo empezar a cobrar con MediaNetPay."
  );

  // ── Lógica ─────────────────────────────────────────────────────────────────

  function scrollBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function appendMessage(role, content) {
    var bubble = el("div", { class: "annie-msg " + role }, esc(content));
    messagesDiv.insertBefore(bubble, typingDiv);
    scrollBottom();
  }

  function appendError(msg) {
    var note = el("div", { class: "annie-error" }, esc(msg));
    messagesDiv.insertBefore(note, typingDiv);
    scrollBottom();
  }

  function setTyping(show) {
    isTyping = show;
    typingDiv.className = show ? "show" : "";
    sendBtn.disabled = show;
    scrollBottom();
  }

  function toggleWindow() {
    isOpen = !isOpen;
    if (isOpen) {
      hideBubble();
      window_.classList.add("annie-open");
      input.focus();
    } else {
      window_.classList.remove("annie-open");
    }
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || isTyping) return;

    input.value = "";
    input.style.height = "auto";
    appendMessage("user", text);

    var currentHistory = history.slice();
    setTyping(true);

    try {
      var res = await fetch(API_URL + "/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: currentHistory }),
      });

      var data = await res.json();

      if (!res.ok) {
        var errMsg = (data && data.detail) || "Error al contactar el asistente.";
        appendError(errMsg);
        return;
      }

      var reply = data.reply || "";
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: reply });
      // Limitar historial cliente a 20 turnos (40 mensajes)
      if (history.length > 40) history = history.slice(-40);

      appendMessage("bot", reply);
    } catch (err) {
      appendError("No pude conectarme. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setTyping(false);
    }
  }

  // ── Eventos ────────────────────────────────────────────────────────────────

  fab.addEventListener("click", toggleWindow);
  document.getElementById("annie-close").addEventListener("click", toggleWindow);
  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
  });

  // Cerrar con ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) toggleWindow();
  });

})();
