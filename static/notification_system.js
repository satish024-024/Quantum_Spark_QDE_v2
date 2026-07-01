/**
 * Notification System
 * Replaces alert() calls with iframe-safe notifications
 */

class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="${this.getIcon(type)}" style="font-size: 16px;"></i>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    opacity: 0.7;
                    font-size: 16px;
                ">&times;</button>
            </div>
        `;

        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }

        // Click to dismiss
        notification.onclick = (e) => {
            if (e.target === notification) {
                this.remove(notification);
            }
        };
    }

    getBackgroundColor(type) {
        switch (type) {
            case 'success': return 'linear-gradient(135deg, #10B981, #059669)';
            case 'error': return 'linear-gradient(135deg, #EF4444, #DC2626)';
            case 'warning': return 'linear-gradient(135deg, #F59E0B, #D97706)';
            case 'info': default: return 'linear-gradient(135deg, #3B82F6, #2563EB)';
        }
    }

    getIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'info': default: return 'fas fa-info-circle';
        }
    }

    remove(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Convenience methods
    success(message, duration) { this.show(message, 'success', duration); }
    error(message, duration) { this.show(message, 'error', duration); }
    warning(message, duration) { this.show(message, 'warning', duration); }
    info(message, duration) { this.show(message, 'info', duration); }
}

// Global notification system instance
window.notifications = new NotificationSystem();

// Replace alert function if in iframe context
if (window !== window.top) {
    console.log('🔔 Running in iframe context, using custom notification system');
    window.alert = (message) => {
        window.notifications.warning(message, 3000);
    };
}
