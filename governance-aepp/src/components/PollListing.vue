<template>
  <div class="ae-card p-4 pb-2 cursor-pointer" @click="$router.push(`/poll/${id}`)">
    <div class="flex items-center vote-id w-full">
      <img class="h-6" src="../assets/hash.svg"/>
      <span class="text-primary text-2xl leading-none mr-2">{{id}}</span>
      <span class="text-2xl leading-none break-words max-w-85">{{data.title}}</span>
    </div>
    <div class="text-gray-500 text-sm">
      <span v-if="percentOfTotalSupply">{{percentOfTotalSupply | formatPercent(2)}} votado - </span>
      <span v-else-if="loading"><ae-loader></ae-loader> votos - </span>
      <span v-if="isClosed">finaliza en {{data.close_height}} (hace ~{{Math.abs(timeDifference) | timeDifferenceToString}})</span>
      <span v-else-if="typeof data.close_height !== 'number'">nunca cierra</span>
      <span v-else>cierra en {{timeDifference | timeDifferenceToString}}</span>
    </div>
  </div>
</template>

<script>
  import {AeLoader} from '@aeternity/aepp-components/src/components/';
  import Backend from "~/utils/backend";
  import aeternity from "~/utils/aeternity";

  export default {
    components: {AeLoader},
    data() {
      return {
        loading: true,
        percentOfTotalSupply: null,
        voteCount: null,
      };
    },
    props: {
      id: {
        type: Number
      },
      data: {
        type: Object
      },
      vote: {
        type: Number,
        default: null
      }
    },
    computed: {
      isClosed() {
        return this.data.close_height < aeternity.height
      },
      timeDifference() {
        return (this.data.close_height - aeternity.height) * 3 * 60 * 1000;
      }
    },
    mounted() {
      Backend.pollOverview(this.data.poll).then(overview => {
        this.percentOfTotalSupply = overview.percentOfTotalSupply;
        this.voteCount = overview.voteCount;
        this.loading = false;
      }).catch(() => {
        this.loading = false;
      });
    }
  };   
</script>

<style scoped>
  .toaster {
    color: white;
    background: rgba(0, 0, 0, 0.8)
  }
  @keyframes rotation {
  from {
    transform: rotate(45deg);
  }
  to {
    transform: rotate(225deg);
  }
}
  .ae-loader {
    border: .2em solid #FE8C00;
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: 1em;
    vertical-align: middle;
    border-left-color: transparent;
    border-right-color: transparent;
    animation-name: rotation;
    animation-duration: 1s;
    animation-iteration-count: infinite;
  }
</style>
