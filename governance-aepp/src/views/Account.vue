<template>
  <div>
    <div class="overlay-loader" v-show="showLoading && !error">
      <BiggerLoader></BiggerLoader>
    </div>
    <div v-if="address">
      <AccountHeader :address="address" :canOpen="false"/>
    </div>
    <div v-if="delegation">
      <div class="mx-4 mt-4">Delegado</div>
      <div class="ae-card mx-4 my-2 py-4 px-3 flex justify-between">
        <ae-identity-light
          :collapsed="true"
          :balance="''"
          @click="$router.push(`/account/${delegation}`)"
          :address="delegation"
        />
        <div v-if="isOwnAccount" class="flex ml-auto">
          <img src="../assets/edit.svg" class="pr-4" @click="() => { delegatee = delegation; delegation = null}">
          <div class="h-full border-r border-gray-500 opacity-50"></div>
          <img src="../assets/delete.svg" class="pl-4 pr-1" @click="revokeDelegation">
        </div>
      </div>
    </div>
    <div v-if="!delegation && isOwnAccount">
      <div class="mx-4 mt-4">Delegue su voto</div>
      <div class="flex bg-white mx-4 my-2">
        <ae-input label="Delegatee" v-model="delegatee" aeddress></ae-input>
        <div class="ml-auto border-r border-gray-500 opacity-50 my-2"></div>
        <img src="../assets/back_gray.svg" class="px-4 rotate-180" @click="createDelegation">
      </div>
    </div>
    <div class="flex w-full text-center text-gray-500 mt-4 text-sm">
      <div class="flex-1 pb-2 border-b-2 border-gray-300 cursor-pointer" @click="switchTab('delegations')"
           :class="{'active-tab': activeTab === 'delegations'}">DELEGACIONES
      </div>
      <div class="flex-1 pb-2 border-b-2 border-gray-300 cursor-pointer" @click="switchTab('votes')"
           :class="{'active-tab': activeTab === 'votes'}">VOTOS
      </div>
      <div class="flex-1 pb-2 border-b-2 border-gray-300 cursor-pointer" @click="switchTab('polls')"
           :class="{'active-tab': activeTab === 'polls'}">ENCUESTAS
      </div>
    </div>
    <div v-if="activeTab === 'votes'">
      <div v-if="votedInPolls.length" class="mt-1">
        <div class="my-2" v-for="[id, data] in votedInPolls">
          <!-- TODO add voted option -->
          <PollListing :id="id" :data="data" class="mx-4"/>
        </div>
      </div>
      <div v-else class="text-gray-500 text-xl text-center my-8">
        No se pudo encontrar votos.
      </div>
    </div>
    <div v-if="activeTab === 'delegations'">
      <div v-if="delegations.length">
        <div v-for="{delegator, _, delegatorAmount, includesIndirectDelegations} in delegations"
             class="ae-card py-4 mx-4 my-2">
          <ae-identity-light
            :collapsed="true"
            :balance="delegatorAmount"
            :address="delegator"
            @click="$router.push(`/account/${delegator}`)"
            class="mx-4"
          />
          <div v-if="includesIndirectDelegations" class="mx-4 mt-1 text-xs">(incluye delegaciones más indirectas)</div>
        </div>
      </div>
      <div v-else class="text-gray-500 text-xl text-center my-8">
        No le han delegado votos.
      </div>
    </div>
    <div v-if="activeTab === 'polls'">
      <div v-if="authorOfPolls.length" class="mt-1">
        <div class="my-2" v-for="[id, data] in authorOfPolls">
          <PollListing :id="id" :data="data" class="mx-4"/>
        </div>
      </div>
      <div v-else class="text-gray-500 text-xl text-center my-8">
        No ha creado ninguna encuesta.
      </div>
    </div>
    <BottomButtons :search-bar="true" :search-button="true" @searchSubmit="handleSearch" :key="`bottomButtons${address}`"></BottomButtons>
    <div class="fixed flex bottom-36 px-8 w-full" v-if="searchError">
      <div class="flex-1 rounded-full bg-gray-500 text-white px-4 py-2 ae-error-field">
        {{searchError}}
      </div>
    </div>
    <CriticalErrorOverlay :error="error" @continue="error = null"></CriticalErrorOverlay>
  </div>
</template>

<script>
  import aeternity from "~/utils/aeternity";
  import {AeIcon, AeButton, AeButtonGroup, AeText} from '@aeternity/aepp-components/src/components/'
  import * as Crypto from '@aeternity/aepp-sdk/es/utils/crypto';
  import BiggerLoader from '../components/BiggerLoader'
  import AeIdentityLight from '../components/AeIdentityLight'
  import BigNumber from 'bignumber.js';
  import Backend from "~/utils/backend";
  import PollListing from "~/components/PollListing";
  import BottomButtons from "~/components/BottomButtons";
  import AccountHeader from "~/components/AccountHeader";
  import CriticalErrorOverlay from "~/components/CriticalErrorOverlay";
  import AeInput from '~/components/ae-input'

  export default {
    name: 'Home',
    components: {
      CriticalErrorOverlay,
      AccountHeader,
      BottomButtons,
      AeIcon, AeButton, AeButtonGroup, AeInput, BiggerLoader, AeIdentityLight, AeText, PollListing
    },
    data() {
      return {
        showLoading: true,
        address: null,
        balance: null,
        power: null,
        delegatee: "",
        isOwnAccount: false,
        delegation: null,
        delegatedPower: null,
        activeTab: null,
        delegations: [],
        votedInPolls: [],
        authorOfPolls: [],
        error: null,
        searchError: null,
        availableTabs: ["delegations", "votes", "polls"]
      }
    },
    computed: {},
    beforeRouteUpdate(to, from, next) {
      next();
      if (this.address !== this.$route.params.account) this.loadData();
      else this.activeTab = this.$route.query.tab ? this.$route.query.tab : 'delegations'
    },
    methods: {
      handleSearch(searchText) {
        this.searchError = '';
        if (!searchText) return this.searchError = 'Por favor ingrese una dirección';
        if (Crypto.isAddressValid(searchText)) {
          this.$router.push(`/account/${searchText}`)
        } else {
          this.searchError = 'La dirección no es válida'
        }
      },
      switchTab(newTab) {
        if (this.activeTab !== newTab) this.$router.push({query: {tab: newTab}})
      },
      touchStartEvent(event) {
        this.startPosition = {x: event.touches[0].clientX, y: event.touches[0].clientY};
      },
      touchEndEvent(event) {
        const diff = {
          x: event.changedTouches[event.changedTouches.length - 1].clientX - this.startPosition.x,
          y: event.changedTouches[event.changedTouches.length - 1].clientY - this.startPosition.y
        };
        if (Math.abs(diff.x) > Math.abs(diff.y) && Math.abs(diff.x) > 100) {
          this.swipeTab(diff.x);
        }
        this.startPosition = {x: null, y: null};
      },
      swipeTab(diffX) {
        const currentIndex = this.availableTabs.indexOf(this.activeTab);
        let direction = diffX > 0 ? -1 : 1;
        if (currentIndex + direction < 0) direction = 4;
        this.switchTab(this.availableTabs[(currentIndex + direction) % this.availableTabs.length]);
      },
      async createDelegation() {
        if (this.delegatee.includes('ak_')) {
          this.showLoading = true;
          try {
            await aeternity.contract.methods.delegate(this.delegatee);
            await Backend.contractEvent("Delegation").catch(console.error);
            await this.loadData();
          } catch (e) {
            console.error(e);
            this.showLoading = false;
            this.error = 'No se pudo crear la delegación. Pruebe nuevamente.';

          }
        }
      },
      async revokeDelegation() {
        this.showLoading = true;
        try {
          await aeternity.contract.methods.revoke_delegation();
          await Backend.contractEvent("RevokeDelegation").catch(console.error);
          await this.loadData();
        } catch (e) {
          console.error(e);
          this.showLoading = false;
          this.error = 'No se pudo revocar la delegación. Pruebe nuevamente.'
        }

      },
      resetData() {
        this.showLoading = true;
        this.delegatee = null;
        this.delegations = [];
        this.votedInPolls = [];
        this.authorOfPolls = [];
        this.delegation = null;
        this.totalStake = null;
      },
      async loadData() {
        this.resetData();

        this.address = this.$route.params.account;
        this.isOwnAccount = this.address === aeternity.address;

        this.balance = await aeternity.client.balance(this.address);
        this.delegation = await aeternity.delegation(this.address);
        this.delegations = await aeternity.delegations(this.address);

        await Backend.delegatedPower(this.address).then(delegatedPower => {
          this.delegatedPower = delegatedPower.delegatedPower;
          this.totalStake = new BigNumber(this.balance).plus(this.delegatedPower);
        }).catch(console.error);

        await Backend.accountPollVoterAuthor(this.address).then(data => {
          this.votedInPolls = data.votedInPolls.filter(poll => poll[1].is_listed).sort((a, b) => b[0] - a[0]);
          this.authorOfPolls = data.authorOfPolls.filter(poll => poll[1].is_listed).sort((a, b) => b[0] - a[0]);
        }).catch(console.error);

        this.showLoading = false;
      }
    },
    async mounted() {
      this.loadData();
      this.activeTab = this.$route.query.tab ? this.$route.query.tab : "delegations";
      document.addEventListener('touchstart', this.touchStartEvent, false);
      document.addEventListener('touchend', this.touchEndEvent, false);
    },
    beforeDestroy() {
      document.removeEventListener('touchstart', this.touchStartEvent, false);
      document.removeEventListener('touchend', this.touchEndEvent, false);
    }
  }
</script>

<style scoped>

  .rotate-180 {
    transform: rotate(180deg);
  }

  .active-tab {
    border-color: #FE8C00;
    color: black;
  }

  .bottom-36 {
    bottom: 9rem;
  }

  .ae-error-field {
    border-color: #ff0d0d;
    background-color: #ff0d0d;
  }

</style>
