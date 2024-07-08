<template>
  <cropper
    v-if="selectedProcessingTool === ProcessingToolsEnum.Crop"
    ref="cropper"
    :aria-label="$gettext('Cropper')"
    class="cropper"
    :src="file.url"
    :stencil-component="CropperTools.cropperVariant"
    :resize-image="{ wheel: false }"
    @change="handleUpdateCropper"
  />
  <img
    v-else
    ref="img"
    :key="`media-image-${file.id}`"
    :aria-label="$gettext('Displayed image')"
    class="image"
    :src="file.url"
    :alt="file.url === '' ? `${file.name} \n The file is to large to render` : file.name"
    :data-id="file.id"
    :style="`zoom: ${currentImageZoom};transform: rotate(${currentImageRotation}deg); ${adjustmentParams}`"
  />
</template>
<script lang="ts">
import { computed, defineComponent, PropType, onMounted, ref, watch, unref, nextTick } from 'vue'
import { CachedFile } from '../../helpers/types'
import { useCSSImageAdjustmentParameters } from '../../composables'
import { ComputedRef } from 'vue'
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { CropVariantEnum, ProcessingToolsEnum } from '../../helpers'
import { mapMutations } from 'vuex'
import { useImageEditorStore } from '../../piniaStores/imageEditorStore'

export default defineComponent({
  name: 'MediaImage',
  components: {
    Cropper
  },
  props: {
    file: {
      type: Object as PropType<CachedFile>,
      required: true
    },
    currentImageZoom: {
      type: Number,
      required: true
    },
    currentImageRotation: {
      type: Number,
      required: true
    },
    currentImagePositionX: {
      type: Number,
      required: true
    },
    currentImagePositionY: {
      type: Number,
      required: true
    }
  },
  emits: ['panZoomChange'],
  setup(props, { emit }) {
    const img = ref<HTMLElement | null>()
    const panzoom = ref<PanzoomObject>()

    const onPanZoomChange = (event: Event) => {
      emit('panZoomChange', event)
    }

    const initPanzoom = async () => {
      if (unref(panzoom)) {
        await nextTick()
        ;(unref(img) as unknown as HTMLElement).removeEventListener(
          'panzoomchange',
          onPanZoomChange
        )
        unref(panzoom)?.destroy()
      }

      // wait for next tick until image is rendered
      await nextTick()

      panzoom.value = Panzoom(unref(img), {
        animate: false,
        duration: 300,
        overflow: 'auto',
        maxScale: 10,
        setTransform: (_, { scale, x, y }) => {
          let h: number
          let v: number

          switch (props.currentImageRotation) {
            case -270:
            case 90:
              h = y
              v = 0 - x
              break
            case -180:
            case 180:
              h = 0 - x
              v = 0 - y
              break
            case -90:
            case 270:
              h = 0 - y
              v = x
              break
            default:
              h = x
              v = y
          }

          unref(panzoom).setStyle(
            'transform',
            `rotate(${props.currentImageRotation}deg) scale(${scale}) translate(${h}px, ${v}px)`
          )
        }
      } as PanzoomOptions)
      ;(unref(img) as unknown as HTMLElement).addEventListener('panzoomchange', onPanZoomChange)
    }

    watch(img, initPanzoom)
    onMounted(initPanzoom)

    watch([() => props.currentImageZoom, () => props.currentImageRotation], () => {
      unref(panzoom).zoom(props.currentImageZoom)
    })

    watch([() => props.currentImagePositionX, () => props.currentImagePositionY], () => {
      unref(panzoom).pan(props.currentImagePositionX, props.currentImagePositionY)
    })

    const store = useImageEditorStore()
    const imageAdjustmentParams = computed(() => store.allParameters)

    const adjustmentParams: ComputedRef<string> = computed(() =>
      useCSSImageAdjustmentParameters(unref(imageAdjustmentParams))
    )

    const selectedProcessingTool = computed<ProcessingToolsEnum>(
      () => store.getSelectedProcessingTool
    )

    const CropperTools = computed(() => {
      const activeCropVariant = store.getCropVariant
      let Stencil

      switch (activeCropVariant) {
        case CropVariantEnum.Circular:
          Stencil = CircleStencil
          break

        default:
          Stencil = RectangleStencil
          break
      }

      return { cropperVariant: Stencil }
    })

    return {
      img,
      adjustmentParams,
      selectedProcessingTool,
      CropperTools,
      ProcessingToolsEnum
    }
  },
  methods: {
    ...mapMutations('Preview', ['UPDATE_CROPPED_CANVAS']),
    handleUpdateCropper({ canvas }) {
      this.UPDATE_CROPPED_CANVAS(canvas)
    }
  }
})
</script>

<style lang="scss" scoped>
img {
  max-width: 80%;
  max-height: 80%;
  cursor: move;
}
.cropper {
  overflow: hidden;
  max-width: calc(100vw - 20rem);
}
</style>
