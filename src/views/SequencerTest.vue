<template>
  <div class="sequencer">
    <h1 class="text-center">
      Contract
    </h1>
    <div class="text-center mb-2">
      <a
        target="_blank"
        :href="`https://testnet.redstone.tools/${contractId}`"
        >{{ contractId }}</a
      >
    </div>
    <div class="d-flex justify-content-center col-12 mb-3">
      <div class="align-self-center">Your address: {{ userAddress }}</div>
      <b-button class="ml-3" variant="outline-primary" @click="mint"
        >Mint</b-button
      >
    </div>
    <b-tabs content-class="mt-3" class="contract-tabs" :lazy="true">
      <b-tab title="Transfer" active>
        <ul>
          <div class="d-flex border-bottom mb-3">
            <div class="p-2 col-6 font-weight-bold bluetext">
              Address
            </div>
            <div class="p-2 col-2 font-weight-bold bluetext">
              Balance
            </div>
          </div>
          <li
            v-for="(balance, index) in balances"
            :key="balance.address"
            class="d-flex"
            v-bind:class="{ owner: balance.active }"
          >
            <div class="p-2 col-6 align-self-center">
              {{ balance.address }}
            </div>
            <div class="p-2 col-2 font-weight-bold d-flex align-self-center">
              <div>
                {{ balance.balance }}
              </div>
              <div
                v-show="balance.text"
                class="ml-2 align-self-center greentext"
              >
                {{ balance.text }}
              </div>
              <div
                v-show="balance.error"
                class="ml-2 align-self-center redtext"
              >
                {{ balance.error }}
              </div>
            </div>
            <div class="col-4">
              <b-input-group>
                <b-form-input v-model="balance.value"></b-form-input>
                <b-input-group-append>
                  <b-button
                    class="ml-2 blue"
                    @click="transfer(balance.address, balance.value, index)"
                    >Transfer</b-button
                  >
                </b-input-group-append>
              </b-input-group>
            </div>
          </li>
        </ul>
      </b-tab>
      <b-tab title="State">
        <div class="row d-flex justify-content-center">
          <json-viewer
            class="col-8"
            :value="stateTest"
            :expand-depth="4"
            sort
          ></json-viewer></div
      ></b-tab>
    </b-tabs>
  </div>
</template>

<script>
import JsonViewer from "vue-json-viewer";
import { mapState } from "vuex";
import deployedContracts from "../deployed-contracts.json";
import { SmartWeaveWebFactory } from "redstone-smartweave";
import Vue from "vue";

export default {
  data() {
    return {
      balances: [],
      contractId: deployedContracts.warp_test,
      contractTest: null,
      stateTest: null,
      userAddress: null,
      walletTest: null,
    };
  },
  components: { JsonViewer },
  computed: {
    ...mapState(["arweaveTest"]),
    // reversedArr() {
    //   return this.balances.slice().reverse();
    // },
  },
  async mounted() {
    this.walletTest = await this.arweaveTest.wallets.generate();
    const walletAddress = await this.arweaveTest.wallets.getAddress(
      this.walletTest
    );
    await this.arweaveTest.api.get(`/mint/${walletAddress}/1000000000000000`);
    await this.arweaveTest.api.get("mine");
    const smartweave = SmartWeaveWebFactory.memCachedBased(
      this.arweaveTest
    ).build();

    // Interacting with the contract
    this.contractTest = smartweave
      .contract(deployedContracts.warp_test)
      .connect(this.walletTest)
      .setEvaluationOptions({
        waitForConfirmation: true,
        updateCacheForEachInteraction: false,
      });
    this.stateTest = await this.contractTest.readState();

    await this.loadBalances();
  },
  methods: {
    async transfer(address, qty, idx) {
      let newResult;
      let testId;
      this.$toasted.show("Processing...");
      let oldBalance = this.balances[idx].balance;

      const userIdx = this.balances.findIndex(
        (b) => b.address == this.userAddress
      );
      let oldBalanceUser = this.balances[userIdx].balance;

      try {
        this.balances[idx].blue = true;

        testId = await this.contractTest.writeInteraction({
          function: "transfer",
          target: address,
          qty: parseInt(qty),
        });
      } catch (e) {
        console.log(e);
      }
      console.log(testId);
      await this.arweaveTest.api.get("mine");
      newResult = await this.contractTest.readState();
      const arr = Object.keys(newResult.state.balances).map((key) => [
        key,
        newResult.state.balances[key],
      ]);
      arr.reverse().forEach((b, index) => {
        Vue.set(this.balances, index, {
          address: b[0],
          balance: b[1],
          blue: false,
          text: null,
          error: null,
          active: b[0] == this.userAddress,
        });
      });

      if (newResult) {
        this.$toasted.clear();
        this.$toasted.global.success("Processed!");
        this.$toasted.global.close(`Interaction id: ${testId}`);
      }

      this.balances[userIdx].error = `-${oldBalanceUser -
        this.balances[userIdx].balance}`;
      setTimeout(() => (this.balances[userIdx].error = null), 2000);

      this.balances[idx].text = `+${this.balances[idx].balance - oldBalance}`;
      setTimeout(() => (this.balances[idx].text = null), 2000);
    },
    async loadBalances() {
      const userAddress = await this.arweaveTest.wallets.jwkToAddress(
        this.walletTest
      );
      this.userAddress = userAddress;
      const arr = Object.keys(this.stateTest.state.balances).map((key) => [
        key,
        this.stateTest.state.balances[key],
      ]);
      arr.reverse().forEach((b) => {
        this.balances.push({
          address: b[0],
          balance: b[1],
          blue: false,
          text: null,
          error: null,
          active: b[0] == userAddress,
        });
      });
    },
    async mint() {
      await this.contractTest.writeInteraction({
        function: "mint",
      });
      await this.arweaveTest.api.get("mine");

      const newResult = await this.contractTest.readState();
      const arr = Object.keys(newResult.state.balances).map((key) => [
        key,
        newResult.state.balances[key],
      ]);
      arr.reverse().forEach((b, index) => {
        Vue.set(this.balances, index, {
          address: b[0],
          balance: b[1],
          blue: false,
          error: null,
          text: null,
          active: b[0] == this.userAddress,
        });
      });
    },
  },
};
</script>

<style lang="scss">
.toasting {
  background-color: #5982f1;
}

.btn-outline-primary {
  border-color: #5982f1 !important;
  color: #5982f1 !important;

  &:hover {
    color: #fff !important;
    background-color: #5982f1 !important;
    border-color: #5982f1 !important;
  }
}

.toasted.toasted-primary.default {
  transform: translateY(-60px) !important;
  background-color: #e8f4f8;
  color: black;
  font-weight: 500;

  &.toasting {
    background-color: #5dbb63;
    color: white;
    .action.ripple {
      color: black !important;
    }
  }
  .action.ripple {
    color: #5982f1 !important;
  }
}

.greentext {
  color: #5dbb63;
}

.redtext {
  color: red;
}
</style>
