
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
  name:"mint"
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

export async function themesLoad() {

  if (localStorage.getItem("theme") != null) {
    document.body.setAttribute("data-theme", localStorage.getItem("theme"));
  } else {
    document.body.setAttribute("data-theme", 'dark');
  }

  for(let i = 0; i < themes.length; i++) {
    let el = document.createElement("li");
    el.innerText = themes[i].name;
    el.addEventListener("click", () => {
      rootData.theme = themes[i].key;
      localStorage.setItem("theme", themes[i].key);
    });

    for(let z = 0; z < wrappers.length; z++) {
      wrappers[z].appendChild(el.cloneNode(true));
    }
  }
}

await themesLoad();