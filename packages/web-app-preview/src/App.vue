<template>
  <div class="preview-body">
    <media-settings
      v-if="activeMediaFileCached.isImage && isEditModeActivated"
      :aria-label="$gettext('Media settings')"
      @change-processing-tool="handleChangeProcessingTool"
      @download="triggerActiveFileDownload"
      @save-cropped-image="save"
      @rotate-image="currentImageRotation += $event"
    />
    <div class="oc-width-1-1">
      <div v-if="loading" class="oc-width-1-1">
        <div class="oc-position-center">
          <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
        </div>
      </div>
      <oc-icon
        v-else-if="isFileContentError"
        name="file-damage"
        variation="danger"
        size="xlarge"
        class="oc-position-center"
        :accessible-label="$gettext('Failed to load media file')"
      />
      <div
        v-else
        ref="preview"
        class="oc-flex oc-width-1-1 oc-height-1-1"
        tabindex="-1"
        @keydown.left="handleSetActiveMediaFile(activeIndex - 1)"
        @keydown.right="handleSetActiveMediaFile(activeIndex + 1)"
        @keydown.esc="closePreview"
      >
        <div class="stage" :class="{ lightbox: isFullScreenModeActivated }">
          <div v-show="activeMediaFileCached" class="stage_media">
            <media-image
              v-if="activeMediaFileCached.isImage"
              :file="activeMediaFileCached"
              :current-image-rotation="currentImageRotation"
              :current-image-zoom="currentImageZoom"
              :current-image-position-x="currentImagePositionX"
              :current-image-position-y="currentImagePositionY"
              @pan-zoom-change="onPanZoomChanged"
            />
            <media-video
              v-else-if="activeMediaFileCached.isVideo"
              :file="activeMediaFileCached"
              :is-auto-play-enabled="isAutoPlayEnabled"
            />
            <media-audio
              v-else-if="activeMediaFileCached.isAudio"
              :file="activeMediaFileCached"
              :resource="activeFilteredFile"
              :is-auto-play-enabled="isAutoPlayEnabled"
            />
          </div>
          <!-- <media-controls
        class="stage_controls"
        :files="filteredFiles"
        :active-index="activeIndex"
        :is-full-screen-mode-activated="isFullScreenModeActivated"
        :is-folder-loading="isFolderLoading"
        :is-image="activeMediaFileCached?.isImage"
        :current-image-rotation="currentImageRotation"
        :current-image-zoom="currentImageZoom"
        @set-rotation="currentImageRotation = $event"
        @set-zoom="currentImageZoom = $event"
        @reset-image="resetImage"
        @toggle-full-screen="toggleFullscreenMode"
        @toggle-previous="prev"
        @toggle-next="next"
      /> -->

          <media-controls
            class="stage_controls"
            :files="filteredFiles"
            :active-index="activeIndex"
            :is-full-screen-mode-activated="isFullScreenModeActivated"
            :is-edit-mode-activated="isEditModeActivated"
            :is-folder-loading="isFolderLoading"
            :is-image="activeMediaFileCached.isImage"
            :current-image-zoom="currentImageZoom"
            @set-zoom="currentImageZoom = $event"
            @toggle-full-screen="toggleFullscreenMode"
            @toggle-edit-mode="toggleEditMode"
            @toggle-previous="prev"
            @toggle-next="next"
          />
        </div>
        <quick-commands
          :aria-label="$gettext('Quick commands')"
          :current-image-zoom="currentImageZoom"
          :is-image="activeMediaFileCached.isImage"
          :is-saveable="isSaveable"
          @download="triggerActiveFileDownload"
          @close="closePreview"
          @save="save"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  Ref,
  unref,
  PropType,
  nextTick,
  getCurrentInstance,
  watch
} from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { Resource } from '@ownclouders/web-client'
import {
  AppFileHandlingResult,
  AppFolderHandlingResult,
  FileContext,
  ProcessorType,
  SortDir,
  queryItemAsString,
  usePreviewService,
  sortHelper,
  useRoute,
  useRouteQuery,
  useRouter,
  useModals,
  useDownloadFile
} from '@ownclouders/web-pkg'

import { createFileRouteOptions } from '@ownclouders/web-pkg'
import MediaControls from './components/MediaControls.vue'
import MediaAudio from './components/Sources/MediaAudio.vue'
import MediaImage from './components/Sources/MediaImage.vue'
import MediaVideo from './components/Sources/MediaVideo.vue'
import { getMimeTypes } from './mimeTypes'
import { PanzoomEventDetail } from '@panzoom/panzoom'
import { Action, ActionOptions } from '@ownclouders/web-pkg/composables/actions/types'
import { useTask } from 'vue-concurrency'
import MediaSettings from './components/MediaSettings.vue'
import QuickCommands from './components/QuickCommands.vue'
import { CachedFile, AdjustmentParametersCategoryType } from './helpers/types'
import applyAdjustmentParams from './composables/saveFunctions/applyAdjustmentParams'
import { mapActions, mapGetters } from 'vuex'
import { useGettext } from 'vue3-gettext'
import { isProjectSpaceResource } from 'web-client'
import { DavProperty } from 'web-client'
import { CropVariantEnum, ProcessingToolsEnum } from './helpers'
import applyCropping from './composables/saveFunctions/applyCropping'
import { useImageEditorStore } from './piniaStores/imageEditorStore'

export const appId = 'preview'

//ToDo: change this to automatic
export const mimeTypes = () => {
  return [
    'audio/flac',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-flac',
    'audio/x-wav',
    'image/gif',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/webm'
    //...((window as any).__$store?.getters.extensionConfigByAppId(appId).mimeTypes || [])
  ]
}

export default defineComponent({
  name: 'Preview',
  components: {
    MediaControls,
    MediaAudio,
    MediaImage,
    MediaVideo,
    MediaSettings,
    QuickCommands
  },
  props: {
    activeFiles: { type: Object as PropType<Resource[]>, required: true },
    currentFileContext: { type: Object as PropType<FileContext>, required: true },
    loadFolderForFileContext: {
      type: Function as PropType<AppFolderHandlingResult['loadFolderForFileContext']>,
      required: true
    },
    getUrlForResource: {
      type: Function as PropType<AppFileHandlingResult['getUrlForResource']>,
      required: true
    },
    revokeUrl: { type: Function as PropType<AppFileHandlingResult['revokeUrl']>, required: true },
    isFolderLoading: { type: Boolean, required: true }
    //getFileContens,putFileContents, getFileInfo needed
  },
  emits: ['update:resource'],
  setup(props, { emit }) {
    const router = useRouter()
    const route = useRoute()
    const { dispatchModal, removeModal } = useModals()
    const { downloadFile } = useDownloadFile()
    const store = useImageEditorStore()
    const contextRouteQuery = useRouteQuery('contextRouteQuery') as unknown as Ref<
      Record<string, string>
    >

    const resource: Ref<Resource> = ref()
    const appliedAdjustmentParameters = ref<AdjustmentParametersCategoryType[]>()

    const activeIndex = ref<number>()
    const cachedFiles = ref<CachedFile[]>([])
    const folderLoaded = ref(false)
    const isFileContentError = ref(false)
    const isAutoPlayEnabled = ref(true)
    const toPreloadImageIds = ref<string[]>([])
    const currentImageZoom = ref(1)
    const currentImageRotation = ref(0)
    const currentImagePositionX = ref(0)
    const currentImagePositionY = ref(0)
    const preloadImageCount = ref(10)
    const preview = ref<HTMLElement>()
    const previewService = usePreviewService()

    const mimeTypes = computed(() => {
      // return getMimeTypes(store.externalAppConfig[appId]?.mimeTypes)
      return [
        'audio/flac',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
        'audio/x-flac',
        'audio/x-wav',
        'image/gif',
        'image/jpeg',
        'image/png',
        'video/mp4',
        'video/webm'
        //...((window as any).__$store?.getters.extensionConfigByAppId(appId).mimeTypes || [])
      ]
    })

    //const store = useAppsStore()
    const currentETag = ref()
    const serverVersion = ref()

    const { $gettext, interpolate: $gettextInterpolate } = useGettext()
    const processingTool = computed(() => store.getSelectedProcessingTool)
    const activeAdjustmentParameters = computed(() => store.allParameters)

    const sortBy = computed(() => {
      if (!unref(contextRouteQuery)) {
        return 'name'
      }
      return unref(contextRouteQuery)['sort-by'] ?? 'name'
    })
    const sortDir = computed<SortDir>(() => {
      if (!unref(contextRouteQuery)) {
        return SortDir.Desc
      }
      return (unref(contextRouteQuery)['sort-dir'] as SortDir) ?? SortDir.Asc
    })

    const isFullScreenModeActivated = ref(false)
    const toggleFullscreenMode = () => {
      const activateFullscreen = !unref(isFullScreenModeActivated)
      isFullScreenModeActivated.value = activateFullscreen
      if (activateFullscreen) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
      }
    }

    const onPanZoomChanged = ({ detail }: { detail: PanzoomEventDetail }) => {
      currentImagePositionX.value = detail.x
      currentImagePositionY.value = detail.y
    }

    const resetImage = () => {
      currentImageZoom.value = 1
      currentImageRotation.value = 0
      currentImagePositionX.value = 0
      currentImagePositionY.value = 0
    }

    const filteredFiles = computed(() => {
      if (!props.activeFiles) {
        return []
      }

      const files = props.activeFiles.filter((file) => {
        return unref(mimeTypes).includes(file.mimeType?.toLowerCase())
      })

      return sortHelper(files, [{ name: unref(sortBy) }], unref(sortBy), unref(sortDir))
    })
    const activeFilteredFile = computed(() => {
      return unref(filteredFiles)[unref(activeIndex)]
    })
    const activeMediaFileCached = computed(() => {
      return unref(cachedFiles).find((i) => i.id === unref(activeFilteredFile)?.id)
    })

    const updateLocalHistory = () => {
      // this is a rare edge case when browsing quickly through a lot of files
      // we workaround context being null, when useDriveResolver is in loading state
      if (!props.currentFileContext) {
        return
      }

      const { params, query } = createFileRouteOptions(
        unref(props.currentFileContext.space),
        unref(activeFilteredFile)
      )
      router.replace({
        ...unref(route),
        params: { ...unref(route).params, ...params },
        query: { ...unref(route).query, ...query }
      })
    }
    const isFileContentLoading = ref(true)

    const instance = getCurrentInstance()

    /////// here image editing functions
    const isSaveable = computed(
      () =>
        unref(appliedAdjustmentParameters) !== unref(activeAdjustmentParameters) ||
        unref(processingTool) === ProcessingToolsEnum.Crop ||
        unref(currentImageRotation) !== 0
    )

    const errorPopup = (error) => {
      // store.dispatch('showMessage', {
      //   title: $gettext('An error occurred'),
      //   desc: error,
      //   status: 'danger'
      // })
    }

    const imageSavedPopup = () => {
      // store.dispatch('showMessage', {
      //   title: $gettext('Image is saved')
      // })
    }

    // async function getMediaFileUrl(file: Resource) {
    //   try {
    //     const loadRawFile = isFileTypeImage(file)
    //     let mediaUrl: string
    //     if (loadRawFile) {
    //       mediaUrl = await props.getUrlForResource(
    //         unref(unref(props.currentFileContext).space),
    //         file
    //       )
    //     } else {
    //       mediaUrl = await loadPreview(file)
    //     }
    //     return mediaUrl
    //   } catch (e) {
    //     console.error(e)
    //   }
    // }

    function isFileTypeImage(file: Resource) {
      return !isFileTypeAudio(file) && !isFileTypeVideo(file)
    }
    function isFileTypeAudio(file: Resource) {
      return file.mimeType.toLowerCase().startsWith('audio')
    }
    function isFileTypeVideo(file: Resource) {
      return file.mimeType.toLowerCase().startsWith('video')
    }

    const isActiveFileTypeAudio = computed(() => isFileTypeAudio(activeFilteredFile.value))
    const isActiveFileTypeVideo = computed(() => isFileTypeVideo(activeFilteredFile.value))
    const isActiveFileTypeImage = computed(() => isFileTypeImage(activeFilteredFile.value))

    function closePreview() {
      if (unref(isSaveable) && unref(processingTool) !== ProcessingToolsEnum.Crop) {
        const modal = {
          variation: 'danger',
          icon: 'warning',
          title: $gettext('Unsaved changes'),
          message: $gettext('Your changes were not saved. Do you want to save them?'),
          cancelText: $gettext('Cancel'),
          buttonSecondaryText: $gettext('Dismiss changes'),
          confirmText: $gettext('Save'),
          // onCancel: () => {
          //   removeModal
          // },
          onConfirmSecondary: () => {
            store.dispatch('hideModal')
            handleResetValues()
            closeApp()
          },
          onConfirm: async () => {
            store.dispatch('hideModal')
            await saveImageTask(false).perform()
            handleResetValues()
            closeApp()
          }
        }
        dispatchModal(modal)
      } else {
        handleResetValues()
        closeApp()
      }
    }

    function handleResetValues() {
      store.resetAdjustmentParameters()
      store.resetSelectedProcessingTool()
    }

    function handleSetNewActiveIndex(newActiveIndex: number) {
      isFileContentLoading.value = true
      if (newActiveIndex >= unref(filteredFiles).length) {
        activeIndex.value = 0
      } else if (newActiveIndex < 0) {
        activeIndex.value = unref(filteredFiles).length - 1
      } else {
        activeIndex.value = newActiveIndex
      }
      isFileContentLoading.value = false
    }

    function handleSetActiveMediaFile(newActiveIndex: number) {
      if (unref(isFileContentLoading)) {
        return
      }

      isFileContentError.value = false

      if (unref(isSaveable) && unref(processingTool) !== ProcessingToolsEnum.Crop) {
        const modal = {
          variation: 'danger',
          icon: 'warning',
          title: $gettext('Unsaved changes'),
          message: $gettext('Your changes were not saved. Do you want to save them?'),
          cancelText: $gettext('Cancel'),
          buttonSecondaryText: $gettext('Dismiss changes'),
          confirmText: $gettext('Save'),
          onCancel: () => {
            store.dispatch('hideModal')
          },
          onConfirmSecondary: () => {
            store.dispatch('hideModal')
            handleSetNewActiveIndex(newActiveIndex)
            updateLocalHistory()
          },
          onConfirm: async () => {
            store.dispatch('hideModal')
            await saveImageTask(false).perform()
            handleSetActiveMediaFile(newActiveIndex)
            updateLocalHistory()
          }
        }
        store.dispatch('createModal', modal)
      } else {
        handleSetNewActiveIndex(newActiveIndex)
        updateLocalHistory()
      }
    }

    const fileActions: Action<ActionOptions>[] = [
      {
        name: 'download-file',
        isEnabled: () => true,
        componentType: 'button',
        icon: 'file-download',
        id: 'preview-download',
        label: () => 'Download',
        handler: () => {
          triggerActiveFileDownload()
        }
      }
    ]

    const triggerActiveFileDownload = () => {
      if (isFileContentLoading.value) {
        return
      }

      if (unref(activeAdjustmentParameters) !== unref(appliedAdjustmentParameters)) {
        const modal = {
          variation: 'danger',
          icon: 'warning',
          title: $gettext('Unsaved changes'),
          message: $gettext(
            'Your changes were not saved. Do you want to save them before downloading?'
          ),
          cancelText: $gettext('Cancel'),
          buttonSecondaryText: $gettext('Dismiss changes'),
          confirmText: $gettext('Save and download'),
          onCancel: () => {
            store.dispatch('hideModal')
          },
          onConfirmSecondary: () => {
            store.dispatch('hideModal')
            downloadFile(props.currentFileContext.space, unref(activeFilteredFile))
            handleResetAfterSave()
          },
          onConfirm: async () => {
            store.dispatch('hideModal')
            await saveImageTask(false).perform()
            handleResetAfterSave()
          }
        }
        dispatchModal(modal)
      } else {
        downloadFile(props.currentFileContext.space, unref(activeFilteredFile))
      }
    }

    const isEditModeActivated = ref(false)
    const toggleEditMode = () => {
      const activateEditMode = !unref(isEditModeActivated)
      isEditModeActivated.value = activateEditMode
      // if (activateEditMode) {
      //   if (document.documentElement.requestFullscreen) {
      //     document.documentElement.requestFullscreen()
      //   }
      // } else {
      //   if (document.exitFullscreen) {
      //     document.exitFullscreen()
      //   }
      // }
    }

    function handleChangeProcessingTool(newTool: ProcessingToolsEnum) {
      if (
        unref(isSaveable) &&
        newTool === ProcessingToolsEnum.Crop &&
        unref(processingTool) !== ProcessingToolsEnum.Crop
      ) {
        const modal = {
          variation: 'danger',
          icon: 'warning',
          title: $gettext('Unsaved changes'),
          message: $gettext('Your changes were not saved. Do you want to save the them?'),
          cancelText: $gettext('Cancel'),
          buttonSecondaryText: $gettext('Dismiss changes'),
          confirmText: $gettext('Save'),
          onCancel: () => {
            store.dispatch('hideModal')
          },
          onConfirmSecondary: () => {
            store.dispatch('hideModal')
            store.changeSelectedProcessingTool(newTool)
            store.resetAdjustmentParameters()
            appliedAdjustmentParameters.value = unref(activeAdjustmentParameters)
          },
          onConfirm: async () => {
            store.dispatch('hideModal')
            await saveImageTask(false).perform()
            store.changeSelectedProcessingTool(newTool)
            store.resetAdjustmentParameters()
            appliedAdjustmentParameters.value = unref(activeAdjustmentParameters)
          }
        }
        store.dispatch('createModal', modal)
      } else {
        store.changeSelectedProcessingTool(newTool)
      }
    }

    function handleFullScreenChangeEvent() {
      if (document.fullscreenElement === null) {
        isFullScreenModeActivated.value = false
      }
    }

    function loadMedium() {
      isFileContentLoading.value = true

      // Don't bother loading if file is already loaded and cached
      if (unref(activeMediaFileCached)) {
        setTimeout(
          () => {
            isFileContentLoading.value = false
          },
          // Delay to animate
          50
        )
        return
      }

      this.loadActiveFileIntoCache()
    }

    // async function loadActiveFileIntoCache() {
    //   try {
    //     const loadRawFile = !unref(isActiveFileTypeImage)
    //     let mediaUrl
    //     if (loadRawFile) {
    //       mediaUrl = await props.getUrlForResource(
    //         unref(unref(props.currentFileContext).space),
    //         unref(activeFilteredFile)
    //       )
    //     } else {
    //       mediaUrl = await loadPreview(unref(activeFilteredFile))
    //     }
    //     addPreviewToCache(unref(activeFilteredFile), mediaUrl)
    //     isFileContentLoading.value = false
    //     isFileContentError.value = false
    //   } catch (e) {
    //     isFileContentLoading.value = false
    //     isFileContentError.value = true
    //     console.error(e)
    //   }
    // }

    function addPreviewToCache(file: Resource, url) {
      cachedFiles.value.push({
        id: file.id as string,
        name: file.name,
        url: Number(file.size) < 4096 * 8192 ? url : '',
        ext: file.extension,
        mimeType: file.mimeType,
        isVideo: isFileTypeVideo(file),
        isImage: isFileTypeImage(file),
        isAudio: isFileTypeAudio(file)
      })
    }

    // function preloadImages() {
    //   const loadPreviewAsync = (file: Resource) => {
    //     toPreloadImageIds.value.push(file.id)
    //     loadPreview(file)
    //       .then((mediaUrl) => {
    //         addPreviewToCache(file, mediaUrl)
    //       })
    //       .catch((e) => {
    //         console.error(e)
    //         toPreloadImageIds.value = unref(toPreloadImageIds).filter(
    //           (fileId) => fileId !== file.id
    //         )
    //       })
    //   }
    // }

    function mountActiveFile(driveAliasAndItem: string) {
      for (let i = 0; i < unref(filteredFiles).length; i++) {
        if (
          unref(unref(props.currentFileContext).space)?.getDriveAliasAndItem(
            unref(filteredFiles)[i]
          ) === driveAliasAndItem
        ) {
          activeIndex.value = i
          return
        }
      }

      isFileContentLoading.value = false
      isFileContentError.value = true
    }

    function handleLocalHistoryEvent() {
      const result = router.resolve(document.location as unknown as RouteLocationRaw)
      mountActiveFile(queryItemAsString(result.params.driveAliasAndItem))
    }

    const saveImageTask = () => console.log('save image task')
    // const saveImageTask = (duplicate: boolean) =>
    //   useTask(function* () {
    //     const newVersion = yield getUpdatedBlob()

    //     if (duplicate) {
    //       try {
    //         const nameGenerator = getNewEditedFileName()
    //         let newName: string = nameGenerator.next().value as string

    //         while (unref(filteredFiles).find((file) => file.name === newName)) {
    //           newName = nameGenerator.next().value as string
    //         }

    //         const currentFolder = (
    //           unref(unref(currentFileContext).routeParams).driveAliasAndItem as string
    //         )
    //           .split('/')
    //           .slice(2)
    //           .toString()
    //           .replaceAll(',', '/')

    //         const newPath = `${currentFolder}/${newName}`

    //         const putFileContentsResponse = yield putFileContents(currentFileContext, {
    //           content: newVersion,
    //           path: newPath
    //         })

    //         const { params, query } = createFileRouteOptions(
    //           unref(unref(currentFileContext).space),
    //           putFileContentsResponse
    //         )

    //         const newUrl = router.resolve({
    //           ...unref(route),
    //           params: { ...unref(route).params, ...params },
    //           query: { ...unref(route).query, ...query }
    //         })

    //         window.open(newUrl.fullPath, '_blank')?.focus()

    //         imageSavedPopup()
    //         handleResetAfterSave()
    //       } catch (e) {
    //         switch (e.statusCode) {
    //           case 412:
    //             errorPopup(
    //               $gettext(
    //                 'This file was updated outside this window. Please refresh the page (all changes will be lost).'
    //               )
    //             )
    //             break
    //           case 500:
    //             errorPopup($gettext('Error when contacting the server'))
    //             break
    //           case 507:
    //             const space = store.getters['runtime/spaces/spaces'].find(
    //               (space) => space.id === unref(resource).storageId && isProjectSpaceResource(space)
    //             )
    //             if (space) {
    //               errorPopup(
    //                 $gettextInterpolate(
    //                   $gettext('There is not enough quota on "%{spaceName}" to save this file'),
    //                   { spaceName: space.name }
    //                 )
    //               )
    //               break
    //             }
    //             errorPopup($gettext('There is not enough quota to save this file'))
    //             break
    //           case 401:
    //             errorPopup($gettext("You're not authorized to save this file"))
    //             break
    //           default:
    //             errorPopup(e.message || e)
    //         }
    //       }
    //     } else {
    //       try {
    //         const putFileContentsResponse = yield putFileContents(currentFileContext, {
    //           content: newVersion,
    //           previousEntityTag: unref(currentETag)
    //         })
    //         const mediaUrl = yield getMediaFileUrl(putFileContentsResponse)
    //         removeActivePreviewFromCache()
    //         addPreviewToCache(unref(activeFilteredFile), mediaUrl)

    //         const newActiveIndex = unref(filteredFiles).findIndex(
    //           (file) => file.id === putFileContentsResponse.id
    //         )
    //         handleSetNewActiveIndex(newActiveIndex)
    //         updateLocalHistory()

    //         serverVersion.value = newVersion
    //         currentETag.value = putFileContentsResponse.etag
    //         imageSavedPopup()
    //         handleResetAfterSave()
    //       } catch (e) {
    //         switch (e.statusCode) {
    //           case 412:
    //             errorPopup(
    //               $gettext(
    //                 'This file was updated outside this window. Please refresh the page (all changes will be lost).'
    //               )
    //             )
    //             break
    //           case 500:
    //             errorPopup($gettext('Error when contacting the server'))
    //             break
    //           case 507:
    //             const space = store.getters['runtime/spaces/spaces'].find(
    //               (space) => space.id === unref(resource).storageId && isProjectSpaceResource(space)
    //             )
    //             if (space) {
    //               errorPopup(
    //                 $gettextInterpolate(
    //                   $gettext('There is not enough quota on "%{spaceName}" to save this file'),
    //                   { spaceName: space.name }
    //                 )
    //               )
    //               break
    //             }
    //             errorPopup($gettext('There is not enough quota to save this file'))
    //             break
    //           case 401:
    //             errorPopup($gettext("You're not authorized to save this file"))
    //             break
    //           default:
    //             errorPopup(e.message || e)
    //         }
    //       }
    //     }
    //   }).restartable()

    function removeActivePreviewFromCache() {
      cachedFiles.value = unref(cachedFiles).filter(
        (file) => file.id !== unref(activeMediaFileCached).id
      )
    }

    function save(modalFunctions?: Array<(...args: any[]) => Promise<any> | any>) {
      const modal = {
        id: 'saveChangesModal',
        variation: 'danger',
        icon: 'warning',
        title: $gettext('Save as'),
        message: $gettext('Do you want to save the changes?'),
        cancelText: $gettext('Cancel'),
        buttonSecondaryText: $gettext('Save'),
        confirmText: $gettext('Duplicate'),
        onCancel: () => {
          removeModal('saveModal')
        },
        onConfirmSecondary: async () => {
          removeModal('saveModal')
          await saveImageTask(false).perform()
          modalFunctions && modalFunctions.forEach(async (func) => await func())
        },
        onConfirm: async () => {
          removeModal('saveModal')
          await saveImageTask(true).perform()
        }
      }
      dispatchModal(modal)
    }

    function handleResetAfterSave() {
      switch (processingTool.value) {
        case ProcessingToolsEnum.Crop:
          store.resetSelectedProcessingTool()
          currentImageRotation.value = 0
          break
        case ProcessingToolsEnum.Customize:
          store.resetSelectedProcessingTool()
          store.resetAdjustmentParameters()
          appliedAdjustmentParameters.value = unref(activeAdjustmentParameters)
          currentImageRotation.value = 0
          break
        default:
          store.resetAdjustmentParameters()
          appliedAdjustmentParameters.value = unref(activeAdjustmentParameters)
          currentImageRotation.value = 0
      }
    }

    ///////////////////////

    watch(
      props.currentFileContext,
      async () => {
        if (!props.currentFileContext) {
          return
        }

        if (!unref(folderLoaded)) {
          await props.loadFolderForFileContext(props.currentFileContext)
          folderLoaded.value = true
        }

        ;(instance.proxy as any).setActiveFile(unref(props.currentFileContext.driveAliasAndItem))
      },
      { immediate: true }
    )

    watch(activeFilteredFile, (file) => {
      emit('update:resource', file)
    })

    const loading = computed(() => props.isFolderLoading || unref(isFileContentLoading))

    watch(
      loading,
      async () => {
        if (!unref(loading)) {
          await nextTick()
          unref(preview).focus()
        }
      },
      { immediate: true }
    )

    return {
      activeFilteredFile,
      activeIndex,
      activeMediaFileCached,
      cachedFiles,
      filteredFiles,
      isFileContentLoading,
      isFullScreenModeActivated,
      toggleFullscreenMode,
      updateLocalHistory,
      resetImage,
      isFileContentError,
      isAutoPlayEnabled,
      toPreloadImageIds,
      currentImageZoom,
      currentImageRotation,
      currentImagePositionX,
      currentImagePositionY,
      onPanZoomChanged,
      preloadImageCount,
      preview,
      loading,
      activeAdjustmentParameters,
      appliedAdjustmentParameters,
      fileActions,
      isActiveFileTypeAudio,
      isActiveFileTypeImage,
      isActiveFileTypeVideo,
      isEditModeActivated,
      isSaveable,
      sortBy,
      sortDir,
      closePreview,
      handleChangeProcessingTool,
      handleFullScreenChangeEvent,
      handleLocalHistoryEvent,
      handleSetActiveMediaFile,
      isFileTypeAudio,
      isFileTypeImage,
      isFileTypeVideo,
      loadMedium,
      //loadPreview,
      mountActiveFile,
      //preloadImages,
      save,
      saveImageTask,
      toggleEditMode,
      triggerActiveFileDownload
    }
  },

  computed: {
    //...mapGetters('Preview', ['allParameters']),
    pageTitle() {
      // return this.$gettext('Preview for %{currentMediumName}', {
      //   currentMediumName: this.activeFilteredFile?.name
      // })
      return 'Preview'
    },

    thumbDimensions() {
      switch (true) {
        case window.innerWidth <= 1024:
          return 1024
        case window.innerWidth <= 1280:
          return 1280
        case window.innerWidth <= 1920:
          return 1920
        case window.innerWidth <= 2160:
          return 2160
        default:
          return 3840
      }
    },
    isActiveFileTypeImage() {
      return !this.isActiveFileTypeAudio && !this.isActiveFileTypeVideo
    },
    isActiveFileTypeAudio() {
      return this.isFileTypeAudio(this.activeFilteredFile)
    },
    isActiveFileTypeVideo() {
      return this.isFileTypeVideo(this.activeFilteredFile)
    }
  },

  watch: {
    activeIndex(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.loadMedium()
        this.preloadImages()
      }

      if (oldValue !== null) {
        this.isAutoPlayEnabled = false
      }

      this.currentImageZoom = 1
      this.currentImageRotation = 0
    }
  },

  async mounted() {
    await this.loadFolderForFileContext(this.currentFileContext)
    window.addEventListener('popstate', this.handleLocalHistoryEvent)
    document.addEventListener('fullscreenchange', this.handleFullScreenChangeEvent)
    this.mountActiveFile(unref(this.currentFileContext.driveAliasAndItem))
    this.appliedAdjustmentParameters = this.activeAdjustmentParameters
    ;(this.$refs.preview as HTMLElement).focus()
  },

  beforeUnmount() {
    window.removeEventListener('popstate', this.handleLocalHistoryEvent)
    document.removeEventListener('fullscreenchange', this.handleFullScreenChangeEvent)

    this.cachedFiles.forEach((medium) => {
      this.revokeUrl(medium.url)
    })
  },

  methods: {
    setActiveFile(driveAliasAndItem: string) {
      for (let i = 0; i < this.filteredFiles.length; i++) {
        if (
          unref(this.currentFileContext.space)?.getDriveAliasAndItem(this.filteredFiles[i]) ===
          driveAliasAndItem
        ) {
          this.activeIndex = i
          return
        }
      }

      this.isFileContentLoading = false
      this.isFileContentError = true
    },
    // react to PopStateEvent ()
    handleLocalHistoryEvent() {
      const result = this.$router.resolve(document.location as unknown as RouteLocationRaw)
      this.setActiveFile(queryItemAsString(result.params.driveAliasAndItem))
    },
    handleFullScreenChangeEvent() {
      if (document.fullscreenElement === null) {
        this.isFullScreenModeActivated = false
      }
    },
    loadMedium() {
      console.log('activeMediaFileCached', this.activeMediaFileCached)
      if (this.activeMediaFileCached) {
        return
      }

      this.loadActiveFileIntoCache()
    },
    async loadActiveFileIntoCache() {
      this.isFileContentLoading = true

      try {
        const loadRawFile = !this.isActiveFileTypeImage
        let mediaUrl: string
        if (loadRawFile) {
          mediaUrl = await this.getUrlForResource(
            unref(this.currentFileContext.space),
            this.activeFilteredFile
          )
        } else {
          mediaUrl = await this.loadPreview(this.activeFilteredFile)
        }

        this.addPreviewToCache(this.activeFilteredFile, mediaUrl)
        this.isFileContentLoading = false
        this.isFileContentError = false
      } catch (e) {
        this.isFileContentLoading = false
        this.isFileContentError = true
        console.error(e)
      }
    },
    next() {
      if (this.isFileContentLoading) {
        return
      }
      this.isFileContentError = false
      if (this.activeIndex + 1 >= this.filteredFiles.length) {
        this.activeIndex = 0
        this.updateLocalHistory()
        return
      }
      this.activeIndex++
      this.updateLocalHistory()
    },
    prev() {
      if (this.isFileContentLoading) {
        return
      }
      this.isFileContentError = false
      if (this.activeIndex === 0) {
        this.activeIndex = this.filteredFiles.length - 1
        this.updateLocalHistory()
        return
      }
      this.activeIndex--
      this.updateLocalHistory()
    },
    isFileTypeImage(file: Resource) {
      return !this.isFileTypeAudio(file) && !this.isFileTypeVideo(file)
    },
    isFileTypeAudio(file: Resource) {
      return file.mimeType.toLowerCase().startsWith('audio')
    },

    isFileTypeVideo(file: Resource) {
      return file.mimeType.toLowerCase().startsWith('video')
    },
    addPreviewToCache(file: Resource, url: string) {
      this.cachedFiles.push({
        id: file.id,
        name: file.name,
        url,
        ext: file.extension,
        mimeType: file.mimeType,
        isVideo: this.isFileTypeVideo(file),
        isImage: this.isFileTypeImage(file),
        isAudio: this.isFileTypeAudio(file)
      })
    },
    loadPreview(file: Resource) {
      return this.$previewService.loadPreview({
        space: unref(this.currentFileContext.space),
        resource: file,
        dimensions: [this.thumbDimensions, this.thumbDimensions] as [number, number],
        processor: ProcessorType.enum.fit
      })
    },
    preloadImages() {
      const loadPreviewAsync = (file: Resource) => {
        this.toPreloadImageIds.push(file.id)
        this.loadPreview(file)

          .then((mediaUrl) => {
            this.addPreviewToCache(file, mediaUrl)
          })
          .catch((e) => {
            console.error(e)
            this.toPreloadImageIds = this.toPreloadImageIds.filter((fileId) => fileId !== file.id)
          })
      }

      const preloadFile = (preloadFileIndex: number) => {
        let cycleIndex =
          (((this.activeIndex + preloadFileIndex) % this.filteredFiles.length) +
            this.filteredFiles.length) %
          this.filteredFiles.length

        const file = this.filteredFiles[cycleIndex]

        if (!this.isFileTypeImage(file) || this.toPreloadImageIds.includes(file.id)) {
          return
        }

        loadPreviewAsync(file)
      }

      for (
        let followingFileIndex = 1;
        followingFileIndex <= this.preloadImageCount;
        followingFileIndex++
      ) {
        preloadFile(followingFileIndex)
      }

      for (
        let previousFileIndex = -1;
        previousFileIndex >= this.preloadImageCount * -1;
        previousFileIndex--
      ) {
        preloadFile(previousFileIndex)
      }
    }
  }
})
</script>

<style lang="scss" scoped>
.stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  text-align: center;

  &_media {
    flex-grow: 1;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &_controls {
    height: auto;
    margin: 10px auto;
  }
}
.preview-body {
  display: flex;
  justify-content: space-between;
}
</style>
