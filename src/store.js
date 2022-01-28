import Vue from "vue";
import Vuex from "vuex";
import contract, { arweave } from "./warp-smartweave-contract";
import { arweaveTest } from "./warp-smartweave-contract-test";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    contract,
    arweave,
    arweaveTest,
    state: {},
  },
  mutations: {
    setState(state, swState) {
      state.state = swState;
    },
  },
  actions: {
    async loadState({ commit }) {
      const state = await contract.readState();
      commit("setState", state);
    },
  },
});
