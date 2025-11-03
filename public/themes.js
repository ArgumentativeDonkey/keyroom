
const themes = [{
  key:"dark",
  name:"Dark"
}, {
  key:"blue",
  name:"Blue"
}, {
  key:"sunset",
  name:"Sunset"
}, {
  key:"mint",
  name:"Mint"
}, {
  key:"forest",
  name:"Forest"
}, {
  key:"amethyst",
  name:"Amethyst (purple)"
}, {
  key:"greyscale",
  name:"Grayscale"
}];

const rootData = document.documentElement.dataset;

const wrappers = document.querySelectorAll(".themesDiv");

export function themesLoad() {

  if (localStorage.getItem("theme") != null) {
    rootData.theme = localStorage.getItem("theme");
  } else {
    rootData.theme = 'dark';
  }

  for(let i = 0; i < themes.length; i++) {
    for(let z = 0; z < wrappers.length; z++) {
      let el = document.createElement("li");
      el.innerText = themes[i].name;
      el.addEventListener("click", () => {
        rootData.theme = themes[i].key;
        localStorage.setItem("theme", themes[i].key);
      });
      wrappers[z].appendChild(el);
    }
  }
}

themesLoad();