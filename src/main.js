import Vue from "vue";
import App from "./App.vue";
import VueTimers from "vue-timers";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";
import VueLoaders from "vue-loaders";
import { ObserveVisibility } from "vue-observe-visibility";
import "@babel/polyfill";
import "vue-loaders/dist/vue-loaders.css";
import BootstrapVue from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

import Toasted from "vue-toasted";

Vue.use(Toasted);
Vue.use(BootstrapVue, {
  breakpoints: [`xs`, "sm", "md", "lg", "xl", "xxl"],
});

Vue.config.productionTip = false;

Vue.directive("observe-visibility", ObserveVisibility);

Vue.use(VueTimers);
Vue.use(VueLoaders);

Vue.toasted.register(
  "close",
  function(message) {
    return message;
  },
  {
    closeOnSwipe: false,
    className: ["toasting"],
    action: {
      text: "Close",
      onClick: (e, toastObject) => {
        toastObject.goAway(0);
      },
    },
  }
);

Vue.toasted.register(
  "success",
  function(message) {
    return message;
  },
  {
    className: ["toasting"],
    duration: 2000,
  }
);

Vue.filter("short-address", function(val) {
  if (val) {
    return val.slice(0, 5) + "..." + val.slice(-5);
  } else {
    return "";
  }
});

new Vue({
  router,
  store,
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
