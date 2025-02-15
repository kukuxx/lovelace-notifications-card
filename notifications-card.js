class NotificationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.previousNotifications = [];
    this._handleImageClick = this._handleImageClick.bind(this);
    this._handleFullscreenClick = this._handleFullscreenClick.bind(this);
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }

    this.config = {
      font_size: this._validateFontSize(config.font_size, '16px'),
      line_height: this._validateLineHeight(config.line_height, 1),
      ...config,
    };
    // 只有在設定了 media_width 或 media_height 時才設置 CSS 變數
    if (config.media_width) {
      this.style.setProperty('--media-width', this._validateMediaSize(config.media_width, '100%'));
    }
    if (config.media_height) {
      this.style.setProperty('--media-height', this._validateMediaSize(config.media_height, 'auto'));
    }
  }

  _validateFontSize(size, defaultValue) {
    return typeof size === 'string' && /^\d+(\.\d+)?(px|rem|em)$/.test(size) ? size : defaultValue;
  }

  _validateLineHeight(height, defaultValue) {
    const num = parseFloat(height);
    return !isNaN(num) && num > 0 ? num : defaultValue;
  }

  _validateMediaSize(size, defaultValue) {
    return typeof size === 'string' && (/^\d+(\.\d+)?(px|%)$/.test(size) || size === 'auto') ? size : defaultValue;
  }

  _handleImageClick(event) {
    if (event.target.tagName.toLowerCase() === 'img') {
      const fullscreenContainer = this.shadowRoot.querySelector('.fullscreen-container');
      const fullscreenImage = this.shadowRoot.querySelector('.fullscreen-image');
      fullscreenImage.src = event.target.src;
      fullscreenContainer.classList.add('active');
    }
  }

  _handleFullscreenClick(event) {
    if (event.target.classList.contains('fullscreen-container')) {
      event.target.classList.remove('active');
    }
  }

  set hass(hass) {
    if (!this.config) return;

    const entity = this.config.entity;
    const stateObj = hass.states[entity];

    if (!stateObj) {
      this._renderError(`Entity not found: ${entity}`);
      return;
    }

    const notifications = this._getNotifications(stateObj);
    if (this._areNotificationsEqual(notifications)) return;

    this.previousNotifications = [...notifications];
    this._render(hass, notifications);

    //事件監聽器
    const container = this.shadowRoot.querySelector('.notifications-container');
    container.addEventListener('click', this._handleImageClick);

    const fullscreenContainer = this.shadowRoot.querySelector('.fullscreen-container');
    fullscreenContainer.addEventListener('click', this._handleFullscreenClick);
  }

  _getNotifications(stateObj) {
    const notifications = stateObj.attributes.notifications || [];
    return notifications.length > 0 ? notifications : ["No notifications available."];
  }

  _render(hass, notifications) {
    const theme = hass.themes?.darkMode ? "dark" : "light";
    const styles = this._getStyles(theme);
    const notificationsHTML = notifications.map(
      n => `<div class="bubble">${this._processContent(n)}</div>`
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="notifications-container">${notificationsHTML}</div>
      <div class="fullscreen-container">
        <img class="fullscreen-image" src="" alt="Fullscreen Image">
      </div>
    `;
  }

  _getStyles(theme) {
    const backgroundColor = theme === "dark" ? "#444" : "#f1f1f1";
    const textColor = theme === "dark" ? "#fff" : "#333";

    return `
      .notifications-container {
        padding: 10px;
      }
      .bubble {
        background-color: ${backgroundColor};
        color: ${textColor};
        font-size: ${this.config.font_size};
        line-height: ${parseFloat(this.config.font_size) * this.config.line_height}px;
        border-radius: 25px;
        padding: 10px 15px;
        margin: 20px;
        width: 60%;
        word-wrap: break-word;
        word-break: break-word;
        transition: all 0.3s ease-in-out;
        opacity: 0;
        animation: fadeIn 0.3s forwards;
      }
      .bubble video,
      .bubble img {
        max-width: var(--media-width, 100%);
        height: var(--media-height, auto);  
        border-radius: 15px;
        display: block;
        cursor: pointer;
        transition: transform 0.3s ease;
      }
      .bubble img:hover {
        transform: scale(1.05);
      }
      .fullscreen-container {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }
      .fullscreen-container.active {
        display: flex;
      }
      .fullscreen-image {
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (max-width: 768px) {
        .bubble {
          width: auto;
          margin: 10px;
        }
      }
      @media (min-width: 1024px) {
        .bubble {
          width: 77%;
        } 
        .bubble video,
        .bubble img {
          max-width: var(--media-width, 35%);
        }
      }
    `;
  }

  _processContent(content) {
    const processed = String(content).replace(/(?<![>])\n(?![<])/g, '<br>');
    const temp = document.createElement('div');
    temp.innerHTML = processed;
    this._sanitizeNode(temp);
    return temp.innerHTML;
  }

  _sanitizeNode(node) {
    const ALLOWED_TAGS = new Set([
      'ha-alert', 'blockquote', 'font', 'img', 'video', 'source',
      'strong', 'b', 'i', 'br', 'a', 'div', 'span',
    ]);
    const ALLOWED_ATTRS = new Set([
      'alert-type', 'color', 'src', 'controls', 'preload', 'type',
      'class', 'style', 'href',
    ]);

    Array.from(node.children).forEach(child => {
      if (child.nodeType === 1) {
        const tagName = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
          node.replaceChild(document.createTextNode(child.textContent), child);
        } else {
          Array.from(child.attributes).forEach(attr => {
            if (!ALLOWED_ATTRS.has(attr.name) || attr.name.startsWith('on')) {
              child.removeAttribute(attr.name);
            }
          });
          this._sanitizeNode(child);
        }
      }
    });
  }

  _renderError(message) {
    this.shadowRoot.innerHTML = `
      <div style="color: red; padding: 16px;">
        ${this._escapeHTML(message)}
      </div>
    `;
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _areNotificationsEqual(notifications) {
    if (notifications.length !== this.previousNotifications.length) return false;
    return notifications.every((n, i) => n === this.previousNotifications[i]);
  }

  disconnectedCallback() {
    const container = this.shadowRoot.querySelector('.notifications-container');
    const fullscreenContainer = this.shadowRoot.querySelector('.fullscreen-container');

    if (container) {
      container.removeEventListener('click', this._handleImageClick);
    }
    if (fullscreenContainer) {
      fullscreenContainer.removeEventListener('click', this._handleFullscreenClick);
    }
  }

  getCardSize() {
    return this.previousNotifications.length || 1;
  }
}

customElements.define("notifications-card", NotificationCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "notifications-card",
  name: "Notifications Card",
  description: "A card that displays notifications.",
  preview: false,
});
