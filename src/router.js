import Vue from "vue";
import Router from "vue-router";
import Sequencer from "./views/Sequencer.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "sequencer",
      component: Sequencer,
    },
  ],
});
