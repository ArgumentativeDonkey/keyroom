const themes = [{
  key:"dark",
  name:"dark"
}, {
  key:"blue",
  name:"blue"
}, {
  key:"sunset",
  name:"sunset"
}, {
  key:"mint",
  name:"mint"
}, {
  key:"forest",
  name:"forest"
}, {
  key:"amethyst",
  name:"amethyst"
}, {
  key:"greyscale",
  name:"grayscale"
}];

const wrappers = document.querySelectorAll(".themesDiv");

export async function themesLoad() {
  console.log("Wrappers found:", wrappers.length);
  
  if (localStorage.getItem("theme") != null) {
    document.body.setAttribute("data-theme", localStorage.getItem("theme"));
  } else {
    document.body.setAttribute("data-theme", 'dark');
  }
  
  for(let i = 0; i < themes.length; i++) {
    for(let z = 0; z < wrappers.length; z++) {
      let el = document.createElement("li");
      el.innerText = themes[i].name;
      el.addEventListener("click", () => {
        console.log("Clicked:", themes[i].key);
        document.body.setAttribute("data-theme", themes[i].key);
        localStorage.setItem("theme", themes[i].key);
      });
      wrappers[z].appendChild(el);
    }
  }
}

await themesLoad();