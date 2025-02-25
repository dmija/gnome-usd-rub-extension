const { St, GLib, GObject, Soup, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

let usdRubIndicator;
const USD_RUB_API_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
const REFRESH_RATE = 300; 

const USDRUBIndicator = GObject.registerClass(
    class USDRUBIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, "USD to RUB Exchange Rate");

            this._httpSession = new Soup.SessionAsync();
            Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.CookieJar());
            
            this.label = new St.Label({
                text: "Loading...",
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this.label);

            let menuItem = new PopupMenu.PopupMenuItem("Refresh");
            menuItem.connect("activate", () => this._fetchExchangeRate());
            this.menu.addMenuItem(menuItem);

            this._fetchExchangeRate();
            this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, REFRESH_RATE, () => {
                this._fetchExchangeRate();
                return true;
            });
        }

        _fetchExchangeRate() {
            let request = Soup.Message.new("GET", USD_RUB_API_URL);
            this._httpSession.queue_message(request, (session, response) => {
                if (response.status_code !== 200) {
                    this.label.set_text("Error");
                    logError(`HTTP Error: ${response.status_code}`);
                    return;
                }

                try {
                    let json = JSON.parse(response.response_body.data);
                    let usdRate = json.Valute.USD.Value.toFixed(2);
                    this.label.set_text(`USD: ${usdRate} ₽`);
                } catch (e) {
                    this.label.set_text("Error");
                    logError(e);
                }
            });
        }

        destroy() {
            if (this._timeout) {
                GLib.Source.remove(this._timeout);
                this._timeout = null;
            }
            if (this._httpSession) {
                this._httpSession = null;
            }
            super.destroy();
        }
    }
);

function enable() {
    usdRubIndicator = new USDRUBIndicator();
    Main.panel.addToStatusArea("usd-rub-indicator", usdRubIndicator);
}

function disable() {
    if (usdRubIndicator) {
        usdRubIndicator.destroy();
        usdRubIndicator = null;
    }
}
