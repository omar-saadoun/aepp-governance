<template>
  <div>
    <div class="overlay-loader" v-show="showLoading">
      <BiggerLoader></BiggerLoader>
    </div>
    <BlackHeader>
      Crear Encuesta
    </BlackHeader>
    <GrayText>
      Utilice el formulario debajo para crear una encuesta.
    </GrayText>
    <div v-if="Object.values(this.errors).some(val => !!val)" class="bg-ae-error mx-4 p-2 my-2">
      <div class="flex mb-1">
        <div class="text-4xl font-bold pl-1 pr-3 leading-none flex items-center">
          !
        </div>
        <div>
          <span class="font-bold">Ocurrió un error!</span> Revise los campos marcados en rojo.
        </div>
      </div>
      <ul class="block ml-6 pl-1">
        <li v-for="error in Object.values(this.errors)" class="list-disc" v-if="error">
          {{error}}
        </li>
      </ul>
    </div>
    <div class="py-2 px-4">
      <ae-input :error="!!errors.titleError" v-model="createMetadata.title" label="Título">
      </ae-input>
    </div>
    <div class="py-2 px-4">
      <ae-input :error="!!errors.descriptionError" v-model="createMetadata.description" label="Descripción">
      </ae-input>
    </div>
    <div class="mt-2">
      <HintBubble v-if="showForumHint">
        Para facilitar la discusión de la propuesta se sugiere crear un hilo en el foro del Partido Digital y linkearlo aqui.
        (<a href="https://foro.partidodigital.org.uy" target="_blank">https://foro.partidodigital.org.uy</a>)
      </HintBubble>
    </div>
    <div class="pb-2 px-4">
      <ae-input :error="!!errors.linkError" v-model="createMetadata.link" label="Link" @blur="linkBlurHandler">
      </ae-input>
    </div>
    <div class="py-2 px-4">
      <AeButtonGroup>
        <ae-button face="round" @click="is_listed = true" :fill="is_listed ? 'primary' : 'neutral'">Pública
        </ae-button>
        <ae-button face="round" @click="is_listed = false" :fill="is_listed ? 'neutral' : 'primary'">Privada
        </ae-button>
      </AeButtonGroup>
    </div>

    <div class="my-2 mx-4 flex items-center bg-white px-4" :class="{'bg-ae-error': !!errors.optionError}"
         v-for="option in options">
      <div class="w-6 flex justify-center">
        <div v-if="option.text" class="rounded-full border-2 border-gray-500 w-6 h-6">&nbsp;</div>
        <div v-else class="text-3xl text-gray-300 text-right font-bold">&plus;</div>
      </div>
      <input v-model="option.text" @input="optionInput" type="text" placeholder="Agregar Opción"
             class="ae-input-option w-full h-full px-2 py-6 outline-none"
             :class="{'bg-ae-error': !!errors.optionError}"/>
      <div v-if="option.text">
        <div class="text-2xl text-gray-500 text-right" @click="removeOption(option.id)">&times;</div>
      </div>
    </div>

    <div class="py-2 px-4 mb-16">
      <ae-input :error="!!errors.closeHeightError" type="number" v-model="closeHeight" @input="updateDateInputs"
                label="Cierra en el bloque">
      </ae-input>
      <div class="mt-4 flex">
        <ae-input type="date" class="mr-2" label="Cierre estimado en" v-model="dateString"
                  @input="updateCloseHeight"></ae-input>
        <ae-input type="time" label="Hora est. cierre" v-model="timeString" @input="updateCloseHeight"></ae-input>
      </div>
      <div class="text-gray-500 text-sm p-2">
        <span v-if="closeHeight && closeHeight > height">
          Para crear una encuesta sin vencimiento configurar el cierro en el bloque 0.
        </span>
        <span v-if="closeHeight && closeHeight < height && closeHeight !== '0'">
          El bloque actual es {{height}} y el de cierre {{closeHeight}} corresponde al pasado.
        </span>
        <span v-if="closeHeight === '0'">
          Esta encuesta nunca finaliza.
        </span>
      </div>
    </div>
    <BottomButtons cta-text="Crear Encuesta" @cta="createPoll"></BottomButtons>
    <CriticalErrorOverlay :error="criticalError" @continue="criticalError = null"></CriticalErrorOverlay>
  </div>
</template>

<script>
  import aeternity from "~/utils/aeternity";
  import {AeIcon, AeButton, AeCheck, AeButtonGroup} from "@aeternity/aepp-components/src/components";
  import pollContractSource from '../../../governance-contracts/contracts/Poll.aes';
  import BiggerLoader from '~/components/BiggerLoader';
  import BottomButtons from "~/components/BottomButtons";
  import BlackHeader from "~/components/BlackHeader";
  import GrayText from "~/components/GrayText";
  import CriticalErrorOverlay from "~/components/CriticalErrorOverlay";
  import AeInput from "~/components/ae-input";
  import HintBubble from "~/components/HintBubble";

  export default {
    name: 'Home',
    components: {
      CriticalErrorOverlay,
      HintBubble,
      GrayText, BlackHeader, BottomButtons, AeIcon, AeButton, AeInput, AeCheck, BiggerLoader, AeButtonGroup
    },
    data() {
      return {
        showLoading: false,
        showForumHint: false,
        createMetadata: {
          title: "",
          description: "",
          link: "",
          // Sophia Type some(<T>) expects a promise. Since spec_ref is not set yet we deliver a rejected promise
          spec_ref: new Promise((_, reject) => reject()).catch(() => {
          })
        },
        is_listed: true,
        optionsString: "",
        closeHeight: 0,
        polls: [],
        options: [{
          id: 0,
          text: ''
        }],
        nextId: 1,
        height: 0,
        heightTimestamp: 0,
        dateString: '',
        timeString: '',
        criticalError: null,
        errors: {
          titleError: null,
          descriptionError: null,
          linkError: null,
          optionError: null,
          closeHeightError: null
        }
      };
    },
    computed: {
      closeDate() {
        if (this.closeHeight - this.height > 0) {
          return new Date(Date.now() + (this.closeHeight - this.height) * 3 * 60 * 1000);
        }
        return null;
      },
    },
    methods: {
      linkBlurHandler() {
        this.showForumHint = this.createMetadata.link ? this.createMetadata.link.indexOf('forum.aeternity.com') === -1 : false;
      },
      leftPad(num) {
        return String("0" + num).slice(-2);
      },
      updateCloseHeight() {
        const closeHeight = Math.round((new Date(`${this.dateString} ${this.timeString}`).getTime() - this.heightTimestamp) / 1000 / 60 / 3) + this.height;
        this.closeHeight = closeHeight < 0 ? 0 : closeHeight;
      },
      updateDateInputs() {
        if (this.closeDate) {
          this.dateString = `${this.closeDate.getFullYear()}-${this.leftPad(this.closeDate.getMonth() + 1)}-${this.leftPad(this.closeDate.getDate())}`;
          this.timeString = `${this.leftPad(this.closeDate.getHours())}:${this.leftPad(this.closeDate.getMinutes())}`;
        } else {
          this.dateString = '';
          this.timeString = '';
        }
      },
      async createPoll() {
        this.errors = {
          titleError: null,
          descriptionError: null,
          linkError: null,
          optionError: null,
          closeHeightError: null
        };

        // VERIFY INPUT
        this.createMetadata.title = this.createMetadata.title.trim();
        if (this.createMetadata.title.length === 0) this.errors.titleError = 'Ingrese un título.';
        if (this.createMetadata.title.length > 50) this.errors.titleError = 'El título es demasiado largo (50 caracteres).';

        this.createMetadata.description = this.createMetadata.description.trim();
        if (this.createMetadata.description.length === 0) this.errors.descriptionError = 'Ingrese una descripción.';

        this.createMetadata.link = this.createMetadata.link.trim();
        if (this.createMetadata.link.indexOf('http') === -1) this.errors.linkError = 'El link debe incluir http:// o https://.';
        if (this.createMetadata.link.length === 0) this.errors.linkError = 'Ingrese un link.';

        let options = this.options.filter(option => !!(option.text.trim()));
        if (options.length < 2) this.errors.optionError = 'Ingrese al menos dos opciones';

        if (this.closeHeight.length === 0) this.errors.closeHeightError = 'Ingrese un bloque de cierre.';
        else if (isNaN(parseInt(this.closeHeight))) this.errors.closeHeightError = 'Debe ingresar un entero.';
        else if (parseInt(this.closeHeight) <= this.height && this.closeHeight !== "0") this.errors.closeHeightError = 'El bloque ingresado ya pasó.';

        if (Object.values(this.errors).some(val => !!val)) return document.querySelector('.wrapper').scrollTo(0, 0);

        // SUBMIT

        if (this.createMetadata.title.length >= 3 && this.options.length >= 3) {
          this.showLoading = true;
          const close_height = parseInt(this.closeHeight) === 0
            ? new Promise((_, reject) => reject()).catch(() => {
            })
            : Promise.resolve(parseInt(this.closeHeight));

          let newID = 0;
          options = this.options.filter(option => !!option.text)
            .map(option => {
              option.id = newID++;
              return option;
            }).reduce((acc, option) => Object.assign(acc, {[option.id]: option.text}), {});

          try {
            const pollContract = await aeternity.client.getContractInstance(pollContractSource);
            const init = await pollContract.methods.init(this.createMetadata, options, close_height);
            const addPoll = await aeternity.contract.methods.add_poll(init.address, this.is_listed);
            this.$router.push(`/poll/${addPoll.decodedResult}`);
          } catch (e) {
            this.showLoading = false;
            this.criticalError = 'Error al crear la encuesta. Pruebe nuevamente';
            if (typeof e === 'string')
              this.criticalError += ` Error: ${e}`;
            console.error(e);
          }

        }
      },
      optionInput(event) {
        if (this.options[this.options.length - 1].text) {
          const nextID = ++this.nextId;
          this.options.push({
            id: nextID,
            text: ''
          });
        }
        if (this.options.length > 1 && !this.options[this.options.length - 2].text) {
          this.options.pop();
        }
      },
      removeOption(id) {
        this.options = this.options.filter(option => option.id !== id);
      }
    },
    async created() {
      await aeternity.initClient();
      this.height = await aeternity.client.height();
      this.heightTimestamp = Date.now();
      this.closeHeight = 20 * 24 * 30 + this.height;
      this.updateDateInputs();
    }
  };
</script>

<style scoped type="text/scss">
  input.ae-input-option {
    font-size: 1.0625rem;
    line-height: 1.5rem;
    font-family: Inter UI, sans-serif;
  }

  .bg-ae-error {
    background-color: #ffeeee;
    /* color: #ff0d0d; */
    color: #ff0d0d;
  }

  .bg-ae-error .text-gray-500 {
    color: #ff0d0d;
  }

  .bg-ae-error .border-gray-500 {
    border-color: #ff0d0d;
  }

</style>
