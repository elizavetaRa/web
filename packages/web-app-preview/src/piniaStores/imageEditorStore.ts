// stores/useStore.js
import { defineStore } from 'pinia'
import {
  AdjustmentParametersCategoryEnum,
  AdjustmentParametersTypeEnum,
  CropVariantEnum
} from '../helpers'

export const useImageEditorStore = defineStore('imageEditorStore', {
  state: () => ({
    adjustmentParameters: [
      {
        name: 'Brightness',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Contrast',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Saturation',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Grayscale',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: 0,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Hue-rotate',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: 0,
        maxValue: 360,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Sepia',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: 0,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.General
      },
      {
        name: 'Exposure',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.FineTune
      },
      {
        name: 'Highlights',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.FineTune
      },
      {
        name: 'Cooling',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.FineTune
      },
      {
        name: 'Vintage',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.FineTune
      },
      {
        name: 'Dramatic',
        type: AdjustmentParametersTypeEnum.Number,
        value: 0,
        minValue: -100,
        maxValue: 100,
        category: AdjustmentParametersCategoryEnum.FineTune
      },
      {
        name: 'Invert',
        type: AdjustmentParametersTypeEnum.Boolean,
        value: false,
        category: AdjustmentParametersCategoryEnum.Miscellaneous
      }
    ],
    selectedProcessingTool: null,
    croppedCanvas: null,
    cropVariant: CropVariantEnum.FreeForm
  }),

  actions: {
    setActiveAdjustmentParameters(payload) {
      this.adjustmentParameters = this.adjustmentParameters.map((adjustmentParameter) =>
        adjustmentParameter.name.toLowerCase() === payload.name.toLowerCase()
          ? { ...adjustmentParameter, value: payload.value }
          : adjustmentParameter
      )
    },
    resetAdjustmentParameters() {
      this.adjustmentParameters = this.adjustmentParameters.map((adjustmentParameter) => {
        switch (adjustmentParameter.type) {
          case AdjustmentParametersTypeEnum.Boolean:
            return { ...adjustmentParameter, value: false }
          default:
            return { ...adjustmentParameter, value: 0 }
        }
      })
    },
    changeSelectedProcessingTool(name) {
      this.selectedProcessingTool = this.selectedProcessingTool === name ? null : name
    },
    resetSelectedProcessingTool() {
      this.selectedProcessingTool = null
    },
    updateCroppedCanvas(canvas) {
      this.croppedCanvas = canvas
    },
    resetCroppedCanvas() {
      this.croppedCanvas = null
    },
    setCropVariant(cropType) {
      this.cropVariant = cropType
    },
    resetCropVariant() {
      this.cropVariant = CropVariantEnum.FreeForm
    }
  },
  getters: {
    generalParameters: (state) => {
      return state.adjustmentParameters.filter(
        (adjustmentParameter) =>
          adjustmentParameter.category === AdjustmentParametersCategoryEnum.General
      )
    },
    fineTuneParameters: (state) => {
      return state.adjustmentParameters.filter(
        (adjustmentParameter) =>
          adjustmentParameter.category === AdjustmentParametersCategoryEnum.FineTune
      )
    },
    miscellaneousParameters: (state) => {
      return state.adjustmentParameters.filter(
        (adjustmentParameter) =>
          adjustmentParameter.category === AdjustmentParametersCategoryEnum.Miscellaneous
      )
    },
    allParameters: (state) => {
      return state.adjustmentParameters
    },
    getSelectedProcessingTool: (state) => {
      return state.selectedProcessingTool
    },
    getCroppedCanvas: (state) => {
      return state.croppedCanvas
    },
    getCropVariant: (state) => {
      return state.cropVariant
    }
  }
})
