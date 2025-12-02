export class Popup {
    static popupList = [];
    static async quick(text, type, parem1=null, parem2=null, parem3=null) {
        return new Promise(resolve => {
            const popup = new Popup;
            popup.inittext(text);
            let defaultResolve = false;
            function enterListener(e) {
                if(e.key === "Enter") {
                    doResolve();
                }
            }
            document.addEventListener('keydown', (e) => {enterListener(e)});
            function doResolve(variable) {
                document.removeEventListener('keydown', (e) => {enterListener(e)});
                popup.hide();
                if(variable === undefined || variable === null) {
                    if(typeof defaultResolve === "function") {
                        variable = defaultResolve();
                    } else {
                        variable = defaultResolve;
                    }
                }
                resolve(variable);
            }
            switch (type) {
                case "ok":
                    defaultResolve = true;
                    popup.initbar(`<button>OK</button>`);
                    popup.bar.querySelector('button').onclick = () => doResolve();
                    break;
                case "continue":
                    defaultResolve = true;
                    popup.initbar(`<button>Continue</button>`);
                    popup.bar.querySelector('button').onclick = () => doResolve();
                    break;
                case "confirm":
                    defaultResolve = true;
                    popup.initbar(`<button>No</button><button>Yes</button>`);
                    popup.bar.querySelectorAll('button')[0].onclick = () => doResolve(false);
                    popup.bar.querySelectorAll('button')[1].onclick = () => doResolve(true);
                    break;
                case "2options":
                    defaultResolve = true;
                    popup.initbar(`<button>${parem1}</button><button>${parem2}</button>`);
                    popup.bar.querySelectorAll('button')[0].onclick = () => doResolve(parem1);
                    popup.bar.querySelectorAll('button')[1].onclick = () => doResolve(parem2);
                    break;
                case "3options":
                    defaultResolve = true;
                    popup.initbar(`<button>${parem1}</button><button>${parem2}</button><button>${parem3}</button>`);
                    popup.bar.querySelectorAll('button')[0].onclick = () => doResolve(parem1);
                    popup.bar.querySelectorAll('button')[1].onclick = () => doResolve(parem2);
                    popup.bar.querySelectorAll('button')[2].onclick = () => doResolve(parem3);
                    break;
                case "text":
                    popup.initbar(`<input type='text'/><button>Submit</button>`);
                    popup.bar.querySelector('button').onclick = () => doResolve();
                    popup.bar.querySelector('input').addEventListener('keypress', (e) => {enterListener(e)});
                    defaultResolve = () => popup.bar.querySelector('input').value;
                    break;
                case "password":
                    popup.initbar(`<input type='password'/><button>Submit</button>`);
                    popup.bar.querySelector('button').onclick = () => doResolve();
                    popup.bar.querySelector('input').addEventListener('keypress', (e) => {enterListener(e)});
                    defaultResolve = () => popup.bar.querySelector('input').value;
                    break;
                default:
                    defaultResolve = false;
                    popup.initbar(`<button>Close</button>`);
                    popup.bar.querySelector('button').onclick = () => doResolve();
                    break;
            }
        });
    }
    constructor() {
        this.popup = document.createElement('div');
        this.popup.classList.add("popup");

        this.popup.dataset.shown = "true";

        // Create text wrapper
        this.text = document.createElement('div');
        this.text.classList.add("text");
        this.popup.appendChild(this.text);

        // Create bar wrapper
        this.bar = document.createElement('div');
        this.bar.classList.add("buttons");
        this.popup.appendChild(this.bar);

        Popup.popupList.push(this);

        document.getElementById("popupDiv").appendChild(this.popup);
    }
    init(text, bar) {
        this.text.innerHTML = text;
        this.bar.innerHTML = bar;
    }
    inittext(text) {
        this.text.innerHTML = text;
    }
    initbar(bar) {
        this.bar.innerHTML = bar;
    }
    show() {
        this.popup.dataset.shown = "true"
    }
    hide() {
        this.popup.dataset.shown = "false"
    }
}