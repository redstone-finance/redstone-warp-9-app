import Vue from "vue";
import Router from "vue-router";
import Sequencer from "./views/Sequencer.vue";
import Home from "./views/Home.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/transfer",
      name: "sequencer",
      component: Sequencer,
    },
    {
      path: "/",
      name: "home",
      component: Home,
    },
  ],
});
