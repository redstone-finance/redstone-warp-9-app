<template>
  <div class="col-12 col-xl-9 sequencer" :key="userAddress">
    <b-button class="ml-2" variant="outline-dark" v-b-modal.modal-2>{{
      walletLoaded ? 'Switch wallet' : 'Connect wallet'
    }}</b-button>
    <b-modal id="modal-2" title="Connect wallet">
      <div class="d-flex justify-content-between">
        <b-button class="ml-2" variant="outline-dark" @click="connectArweaveWallet">arweave.app</b-button>
        <b-button class="ml-2" variant="outline-dark" @click="connectEvmWallet">Metamask</b-button>
      </div>
    </b-modal>
    <div>
      <h1 class="text-center">Contract</h1>
      <div class="text-center mb-4">
        <a
          target="_blank"
          :href="`https://scanner.redstone.tools/#/app/contract/${contractId}`"
          class="d-none d-sm-block"
          >{{ contractId }}</a
        >
        <a
          target="_blank"
          :href="`https://scanner.redstone.tools/#/app/contract/${contractId}`"
          class="d-sm-none d-block"
          >{{ contractId | tx }}</a
        >
      </div>
      <div v-if="walletLoaded" class="d-flex flex-column flex-md-row justify-content-center col-12 mb-3">
        <div class="d-md-flex align-self-center">
          Your address:
          <span class="font-weight-bold d-md-block d-none">{{ userAddress }}</span>
          <span class="font-weight-bold d-block d-md-none">{{ userAddress | tx }}</span>
        </div>
        <div class="d-flex align-self-center pt-3 pt-md-0">
          <b-button class="ml-3" variant="outline-primary" @click="mint">Mint</b-button>
          <img
            v-b-tooltip.hover
            title="In order to perform correct transfer address need to own any tokens. You can mint up to 10000000 tokens."
            src="../assets/question-tooltip.svg"
            class="tooltip-icon"
          />
        </div>
      </div>
      <div v-if="walletLoaded" class="d-flex flex-column flex-md-row justify-content-center col-12 mb-3">
        <div class="d-flex align-self-center pt-3 pt-md-0">
          <b-input-group>
            <b-form-input
              v-model="addressId"
              placeholder="Address"
              type="string"
              class="mr-3"
              style="width: 350px"
            ></b-form-input>

            <b-form-input v-model="transferValue" type="number" placeholder="Qty"></b-form-input>
            <b-input-group-append>
              <b-button class="ml-2 blue" @click="transfer(addressId, transferValue)">Transfer</b-button>
            </b-input-group-append>
          </b-input-group>
        </div>
      </div>
      <b-tabs content-class="mt-3" class="contract-tabs" :lazy="true">
        <b-tab title="Transfer" active>
          <ul>
            <div class="d-flex border-bottom mb-3">
              <div class="p-2 col-6 font-weight-bold bluetext">Recipient Address</div>
              <div class="p-2 col-2 font-weight-bold bluetext">Balance</div>
            </div>
            <div v-show="!loaded" class="loader">
              <pacman-loader :loading="!loaded" :color="color"></pacman-loader>
            </div>
            <li
              v-for="(balance, index) in balances"
              :key="balance.address"
              class="d-flex flex-wrap flex-md-nowrap py-2"
              v-bind:class="{ owner: balance.active }"
            >
              <div class="p-2 col-6 align-self-center">
                <span class="d-md-block d-none">{{ balance.address }}</span>
                <span class="d-block d-md-none">{{ balance.address | tx }}</span>
              </div>
              <div class="p-2 col-2 font-weight-bold d-flex align-self-center">
                <div>
                  {{ balance.balance }}
                </div>
                <div v-show="balance.text" class="ml-2 align-self-center greentext">
                  {{ balance.text }}
                </div>
                <div v-show="balance.error" class="ml-2 align-self-center redtext">
                  {{ balance.error }}
                </div>
              </div>
              <div class="p-2 p-md-0 align-self-center">
                <b-input-group>
                  <b-form-input
                    v-model="balance.value"
                    :disabled="balance.address == userAddress"
                    type="number"
                    min="1"
                    placeholder="Qty"
                  ></b-form-input>
                  <b-input-group-append>
                    <b-button class="ml-2 blue" @click="transfer(balance.address, balance.value, index)"
                      >Transfer</b-button
                    >
                  </b-input-group-append>
                </b-input-group>
              </div>
            </li>
          </ul>
        </b-tab>
        <b-tab title="State" lazy>
          <div class="row d-flex justify-content-center">
            <json-viewer class="col-8" :value="state" :expand-depth="4" sort></json-viewer></div
        ></b-tab>
      </b-tabs>
    </div>
  </div>
</template>

<script>
import JsonViewer from 'vue-json-viewer';
import deployedContracts from '../deployed-contracts.json';
import constants from '../constants.json';
import Vue from 'vue';
import PacmanLoader from 'vue-spinner/src/PacmanLoader.vue';
import axios from 'axios';
import { ArweaveWebWallet } from 'arweave-wallet-connector';
import MetaMaskOnboarding from '@metamask/onboarding';
import { evmSignature } from 'warp-signature';
import { WarpFactory } from 'warp-contracts';
import { utils } from 'ethers';

export default {
  data() {
    return {
      arweave: null,
      contract: null,
      balances: [],
      state: null,
      contractId: deployedContracts.warp,
      userAddress: null,
      loaded: false,
      color: '#5982f1',
      warp: null,
      walletLoaded: false,
      addressId: '',
      transferValue: null,
    };
  },
  components: { JsonViewer, PacmanLoader },
  async mounted() {
    this.warp = WarpFactory.forMainnet();
    this.contract = this.warp.contract(this.contractId);
    await this.loadBalances();
  },
  methods: {
    async connectArweaveWallet() {
      let arweaveWebWallet = new ArweaveWebWallet({
        name: 'Ardit',
      });
      await arweaveWebWallet.setUrl('arweave.app');
      await arweaveWebWallet.connect();
      this.userAddress = arweaveWebWallet.address;
      await this.contract.connect('use_wallet');
      this.$toasted.global.success('Connected!');
      this.$bvModal.hide('modal-2');
      this.walletLoaded = true;
      await this.loadBalances();
    },
    async connectEvmWallet() {
      if (!MetaMaskOnboarding.isMetaMaskInstalled()) {
        this.$toasted.error('Metamask not detected.');
        return;
      }

      await this.contract.connect({
        signer: evmSignature,
        signatureType: 'ethereum',
      });
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      this.userAddress = utils.getAddress(accounts[0]);
      this.$toasted.global.success('Connected!');
      this.walletLoaded = true;

      await this.loadBalances();
    },
    async transfer(address, qty, idx) {
      if (address == this.userAddress) {
        this.$toasted.error('Cannot transfer tokens between same accounts.', {
          duration: 3000,
        });
        return;
      }
      let transferIdx;
      let userIdx = this.balances.findIndex((b) => b.address == this.userAddress);
      if (!idx) {
        const addressIdx = this.balances.findIndex((b) => b.address == address);
        if (addressIdx == -1) {
          transferIdx = 1;
        } else {
          transferIdx = addressIdx;
        }
      } else {
        transferIdx = idx;
      }
      if (!this.walletLoaded) {
        this.$toasted.error('Wallet not connected.', {
          duration: 3000,
        });
        return;
      }
      if (!this.balances[userIdx]) {
        this.$toasted.error('Please mint some tokens first.', {
          duration: 3000,
        });
        return;
      }
      this.$toasted.show('Processing...');

      let oldBalance = this.balances[transferIdx].balance;
      let oldBalanceUser = this.balances[userIdx].balance;
      const bundled = await this.contract.writeInteraction({
        function: 'transfer',
        target: address,
        qty: parseInt(qty),
      });
      const { data } = await axios.get(`${constants.den}/state?id=${deployedContracts.warp}`);
      let newResult = data;
      this.state = newResult;
      if (newResult) {
        this.$toasted.clear();
        this.$toasted.global.success('Processed!');
        this.$toasted.global.close(
          `<div>Interaction id: <a href="https://scanner.redstone.tools/#/app/interaction/${bundled.originalTxId}" target="_blank">${bundled.originalTxId}</a></div>`
        );
      }

      Vue.set(this.balances, transferIdx, {
        address: address,
        balance: newResult.state.balances[address],
        text: null,
        error: null,
      });
      Vue.set(this.balances, userIdx, {
        address: this.userAddress,
        balance: newResult.state.balances[this.userAddress],
        active: true,
        text: null,
        error: null,
      });

      this.balances[userIdx].error = `-${oldBalanceUser - this.balances[userIdx].balance}`;
      setTimeout(() => {
        this.balances[userIdx].error = null;
      }, 2000);
      this.balances[transferIdx].text = `+${this.balances[transferIdx].balance - oldBalance}`;
      setTimeout(() => (this.balances[transferIdx].text = null), 2000);
      this.transferValue = null;
      this.addressId = '';
    },
    async loadBalances() {
      const { data } = await axios.get(`${constants.den}/state?id=${deployedContracts.warp}`);

      this.state = data.state;
      const arr = Object.keys(this.state.balances).map((key) => [key, this.state.balances[key]]);
      const find = arr.find((a) => a[0] == this.userAddress);
      if (find) {
        const user = arr.indexOf(find);
        arr.splice(user, 1);
        arr.unshift(find);
      }

      arr.forEach((b, index) => {
        Vue.set(this.balances, index, {
          address: b[0],
          balance: b[1],
          error: false,
          text: false,
          active: find ? b[0] == this.userAddress : null,
        });
      });
      this.loaded = true;
    },
    async mint() {
      let userIdx = this.balances.findIndex((b) => b.address == this.userAddress);
      if (this.balances[userIdx]) {
        this.$toasted.error(`You've already minted tokens.`, {
          duration: 3000,
        });
        return;
      }

      this.$toasted.show('Processing...');
      const bundled = await this.contract.writeInteraction({
        function: 'mint',
      });
      const { data } = await axios.get(`${constants.den}/state?id=${deployedContracts.warp}`);
      const newResult = data;
      if (newResult) {
        this.$toasted.clear();
        this.$toasted.global.success('Processed!');
        this.$toasted.global.close(
          `<div>Interaction id: <a href="https://scanner.redstone.tools/#/app/interaction/${bundled.originalTxId}" target="_blank">${bundled.originalTxId}</a></div>`
        );
      }
      const arr = Object.keys(newResult.state.balances).map((key) => [key, newResult.state.balances[key]]);
      const find = arr.find((a) => a[0] == this.userAddress);
      const user = arr.indexOf(find);
      arr.splice(user, 1);
      arr.unshift(find);
      arr.forEach((b, index) => {
        Vue.set(this.balances, index, {
          address: b[0],
          balance: b[1],
          error: false,
          text: false,
          active: b[0] == this.userAddress,
        });
      });
    },
  },
};
</script>

<style lang="scss">
.blue {
  background-color: #5982f1 !important;
}

.bluetext {
  color: #5982f1 !important;
}
.contract-tabs > .tabs > div:first-of-type {
  height: 44px;
}
.contract-tabs {
  .tab-pane:nth-of-type(2) {
    padding-left: 0;
    padding-right: 0;

    @media (min-width: breakpoint-min(md)) {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  &.nav-tabs > .nav-item {
    flex: 0 0 124px !important;
  }
}
.sequencer {
  padding: 10px;
  margin: 0 auto;
  margin-top: 50px;
}

.nav-tabs {
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-y: clip;
  overflow-x: scroll;
  background-color: transparent;
}

.nav-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.nav-tabs > .nav-item {
  margin-bottom: 0px;
  flex: 1;
}

.nav-tabs > .nav-item .nav-link.active,
.nav-tabs > .nav-item .nav-link.active:hover,
.nav-tabs > .nav-item .nav-link.active:focus {
  background-color: #fcfcfc;
  color: #233562;
}
p {
  width: 500px;
  max-width: 90vw;
  margin: auto;
  margin-top: 30px;
  text-align: left;
}

.nav-tabs > .nav-item > .nav-link:not(.active) {
  padding: 10px 14px;
  background-color: #fafafa;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  -webkit-box-shadow: inset 0px -6px 2px -4px #e8e8e8, 5px -5px 6px -2px #e8e8e8;
  box-shadow: inset 0px -6px 2px -4px #e8e8e8, 5px -5px 6px -2px #e8e8e8;
  &:after {
    content: ' ';
    height: 23px;
    border-right: 1px solid #d9d9d9;
    border-top-width: 0;
    position: absolute;
    left: -1px;
    bottom: 7px;
  }
}

.showArrows .nav-tabs {
  margin-left: 30px;
  max-width: calc(100% - 58px);
}

.tabs:not(.showArrows) {
  li:first-of-type > .nav-link {
    border-top-left-radius: 5px;
  }

  li:last-of-type > .nav-link {
    border-top-right-radius: 5px;
  }
}
.nav-tabs {
  &.nav-item + .nav-item {
    margin-left: 0;
  }

  border-bottom: none !important;
  background-color: #f7f7f7;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;

  > .nav-item {
    margin-bottom: -2px;

    > .nav-link {
      padding: 12px 18px;
      border: none;

      .label {
        margin-bottom: -2px;
      }

      &:hover {
        background-color: transparent;
        color: #424242;
      }
    }

    .nav-link.open {
      &,
      &:hover,
      &:focus {
        background-color: #fff;
        color: #7d7d7d;
      }
    }

    .nav-link.active {
      &,
      &:hover,
      &:focus {
        background-color: white;
        color: #7d7d7d;
        border: none;

        box-shadow: 1px 1px 2px #ccc;
      }
    }
  }
}

.hide-element {
  display: none;
}

.show-element {
  display: block;
}

.visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.5s linear;
  font-size: 15px;
  color: #5982f1;
  align-self: center;
}

.hidden {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.5s, opacity 0.5s linear;
}

.owner {
  background-color: #e8f4f8;
}

.tooltip-icon {
  width: 25px;
  height: 25px;
  transform: scale(0.6);
  margin-top: -2px;
  filter: invert(66%) sepia(0%) saturate(275%) hue-rotate(191deg) brightness(95%) contrast(97%);
  align-self: center;
}
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

.toasted.toasted-primary {
  transform: translateY(-55px) !important;
  a {
    color: white;
  }
  .action.ripple {
    color: white !important;
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
      color: white !important;
    }
  }
  .action.ripple {
    color: white !important;
  }
}

.greentext {
  color: #5dbb63;
}

.redtext {
  color: red;
}

.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30vh;
}
</style>
