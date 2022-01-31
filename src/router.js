import Vue from "vue";
import Router from "vue-router";
import Sequencer from "./views/Sequencer.vue";
import SequencerTest from "./views/SequencerTest.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "sequencer",
      component: Sequencer,
    },
    {
      path: "/testnet",
      name: "sequencerTest",
      component: SequencerTest,
    },
  ],
});
