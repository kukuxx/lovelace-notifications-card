window.customCards = window.customCards || [];
window.customCards.push({
  type: "notifications-card",
  name: "Notifications Card",
  description: "A card to display notifications.",
});

class NotificationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.previousNotifications = []; // 用來存儲上次的 notifications
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = {
      font_size: config.font_size || '16px', // 默認文字大小
      line_height: config.line_height || 1.5,  // 默認行間距比例
      ...config
    };
  }

  set hass(hass) {
    try {
      const entity = this.config.entity;
      const stateObj = hass.states[entity];

      if (!stateObj) {
        this.shadowRoot.innerHTML = `<div>Entity not found: ${entity}</div>`;
        return;
      }

      const theme = hass.themes.darkMode ? "dark" : "light"; //監聽深色模式
      const backgroundColor = theme === "dark" ? "#444" : "#f1f1f1";
      const textColor = theme === "dark" ? "#fff" : "#333";
      const fontSize = this.config.font_size;
      const lineHeight = parseFloat(fontSize) * (this.config.line_height);
      let notifications = stateObj.attributes.notifications || [];
      if (notifications.length === 0) {
        notifications = ["No notifications available."];
      }

      // 如果內容沒有變化，跳過渲染
      if (this.areNotificationsEqual(notifications)) {
        return;
      }

      // 更新 previousNotifications
      this.previousNotifications = [...notifications];

      const formattedNotifications = notifications
        .map(line => `<div class="bubble">${line}</div>`)
        .join("");

      this.shadowRoot.innerHTML = `
        <style>
          .bubble {
            background-color: ${backgroundColor};
            color: ${textColor};
            font-size: ${fontSize};
            line-height: ${lineHeight}px;
            border-radius: 15px;
            padding: 10px 15px;
            margin: 20px;
            width: 60%;
            display: block;
            position: relative;
            word-wrap: break-word;  
            word-break: break-word;  
            white-space: normal;
          }

          .bubble:after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 10px;
            width: 0;
            height: 0;
            border: 10px solid transparent;
            border-top-color: ${backgroundColor};
            border-bottom: 0;
            margin-left: -10px;
            margin-bottom: -10px;
          }
          
          .bubble video,
          .bubble img {
            max-width: 100% !important;
            height: auto !important;    
            border-radius: 15px; 
          }
          
          @media (max-width: 768px) {
            .bubble {
              width: auto;
            }
          }

          @media (min-width: 1024px) {
            .bubble {
              width: 77%;
            }
          }

        </style>
        <div>${formattedNotifications}</div>
      `;
    } catch (e) {
      console.error("ChatBubbleCard error:", e);
      this.shadowRoot.innerHTML = `<div style="color: red;">Error rendering card: ${e.message}</div>`;
    }
  }

  getCardSize() {
    return 3;
  }

  // 用來比較 notifications 的內容是否改變
  areNotificationsEqual(notifications) {
    if (notifications.length !== this.previousNotifications.length) {
      return false; // 如果長度不同，直接返回 false
    }

    // 深度比較每個通知內容
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i] !== this.previousNotifications[i]) {
        return false;
      }
    }

    return true;
  }
}

customElements.define("notifications-card", NotificationCard);


