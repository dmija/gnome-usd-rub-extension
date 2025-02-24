const { St, Clutter, GLib, Gio, Soup, GObject } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let indicator, session;

function fetchExchangeRate(callback) {
    let url = "https://www.cbr-xml-daily.ru/daily_json.js";
    let request = new Soup.Message({ method: 'GET', uri: new Soup.URI(url) });

    session.queue_message(request, (session, response) => {
        if (!response || response.status_code !== 200) {
            callback("Ошибка");
            return;
        }

        try {
            let data = JSON.parse(response.response_body.data);
            let rate = data.Valute.USD.Value.toFixed(2);
            callback(rate);
        } catch (e) {
            callback("Ошибка");
        }
    });
}

const USDRUBIndicator = GObject.registerClass(
    class USDRUBIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, "USD to RUB Indicator");

            this.label = new St.Label({
                text: "USD: ... ₽",
                y_align: Clutter.ActorAlign.CENTER
            });

            this.add_child(this.label);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            let refreshItem = new PopupMenu.PopupMenuItem('Обновить курс');
            refreshItem.connect('activate', () => this.updateRate());
            this.menu.addMenuItem(refreshItem);

            this.updateRate();
            this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
                this.updateRate();
                return GLib.SOURCE_CONTINUE;
            });
        }

        updateRate() {
            fetchExchangeRate((rate) => {
                this.label.set_text(`USD: ${rate} ₽`);
            });
        }

        destroy() {
            if (this._timeout) GLib.source_remove(this._timeout);
            super.destroy();
        }
    }
);

function init() {
    session = new Soup.Session();
}

function enable() {
    indicator = new USDRUBIndicator();
    Main.panel.addToStatusArea("usd-rub-indicator", indicator);
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}
