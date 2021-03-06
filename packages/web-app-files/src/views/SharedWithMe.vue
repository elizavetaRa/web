<template>
  <div>
    <list-loader v-if="loading" />
    <template v-else>
      <!-- Pending shares -->

      <div
        v-if="filterDataByStatus(activeFiles, shareStatus.pending).length > 0"
        id="pending-shares"
        class="oc-mb"
      >
        <div class="oc-app-bar shares-bar">
          <h2 v-translate>Pending Shares</h2>
          <div class="oc-ml-s">
            <p>({{ filterDataByStatus(activeFiles, shareStatus.pending).length }})</p>
          </div>
        </div>

        <div id="pending-highlight">
          <oc-table-files
            id="files-shared-with-me-pending-table"
            v-model="selected"
            class="files-table"
            :class="{ 'files-table-squashed': isSidebarOpen }"
            :are-previews-displayed="displayPreviews"
            :resources="
              showAllPending === false
                ? filterDataByStatus(activeFiles, 1).slice(0, 3)
                : filterDataByStatus(activeFiles, 1)
            "
            :target-route="targetRoute"
            :are-resources-clickable="false"
            :highlighted="highlightedFile ? highlightedFile.id : null"
            :has-actions="false"
            :header-position="headerPosition"
          >
            <template v-slot:status="{ resource }">
              <div
                :key="resource.id + resource.status"
                class="uk-text-nowrap uk-flex uk-flex-middle uk-flex-right"
              >
                <oc-button
                  v-if="[shareStatus.declined, shareStatus.pending].includes(resource.status)"
                  v-translate
                  variation="success"
                  size="small"
                  class="file-row-share-status-action"
                  @click.stop="triggerShareAction(resource, 'POST')"
                >
                  Accept
                </oc-button>
                <oc-button
                  v-if="[shareStatus.accepted, shareStatus.pending].includes(resource.status)"
                  v-translate
                  size="small"
                  class="file-row-share-status-action oc-ml"
                  @click.stop="triggerShareAction(resource, 'DELETE')"
                >
                  Decline
                </oc-button>
                <span
                  class="uk-text-small oc-ml file-row-share-status-text uk-text-baseline"
                  v-text="getShareStatusText(resource.status)"
                />
              </div>
            </template>
          </oc-table-files>

          <div
            v-if="
              showAllPending === false &&
                filterDataByStatus(activeFiles, shareStatus.pending).length > 3
            "
            class="oc-app-bar centered"
          >
            <oc-button
              key="show-all-button"
              v-translate
              appearance="raw"
              class="show-hide-pending"
              @click="showAllPending = true"
            >
              Show all</oc-button
            >
          </div>

          <div
            v-else-if="
              showAllPending === true &&
                filterDataByStatus(activeFiles, shareStatus.pending).length > 3
            "
            class="oc-app-bar centered"
          >
            <oc-button
              key="show-less-button"
              v-translate
              appearance="raw"
              class="show-hide-pending"
              @click="showAllPending = false"
            >
              Show less
            </oc-button>
          </div>
        </div>
      </div>
      <br />

      <!-- Accepted shares -->
      <div v-if="!showDeclined">
        <div class="oc-app-bar shares-bar">
          <h2 key="accepted-shares-header" v-translate>Accepted Shares</h2>
          <div
            v-if="filterDataByStatus(activeFiles, shareStatus.accepted).length > 0"
            class="oc-ml-s"
          >
            <p>({{ filterDataByStatus(activeFiles, shareStatus.accepted).length }})</p>
          </div>

          <div class="oc-ml-m">
            <oc-button
              id="show-declined"
              key="show-declined-button"
              v-translate
              appearance="raw"
              @click="showDeclined = true"
              >Show declined shares</oc-button
            >
          </div>
        </div>
        <no-content-message
          v-if="isEmpty || filterDataByStatus(activeFiles, shareStatus.accepted).length === 0"
          id="files-shared-with-me-accepted-empty"
          class="files-empty"
          icon="group"
        >
          <template #message>
            <span v-translate>
              You are currently not collaborating on other people's resources
            </span>
          </template>
        </no-content-message>
        <oc-table-files
          v-else
          id="files-shared-with-me-accepted-table"
          v-model="selected"
          class="files-table"
          :class="{ 'files-table-squashed': isSidebarOpen }"
          :are-previews-displayed="displayPreviews"
          :resources="filterDataByStatus(activeFiles, shareStatus.accepted)"
          :target-route="targetRoute"
          :highlighted="highlightedFile ? highlightedFile.id : null"
          :header-position="headerPosition"
          @showDetails="setHighlightedFile"
          @fileClick="$_fileActions_triggerDefaultAction"
        >
          <template v-slot:status="{ resource }">
            <div
              :key="resource.id + resource.status"
              class="uk-text-nowrap uk-flex uk-flex-middle uk-flex-right"
            >
              <oc-button
                v-if="resource.status === 1 || resource.status === 0"
                v-translate
                appearance="raw"
                size="small"
                class="file-row-share-status-action uk-text-meta oc-ml"
                @click.stop="triggerShareAction(resource, 'DELETE')"
              >
                Decline
              </oc-button>
              <span
                class="uk-text-small oc-ml file-row-share-status-text uk-text-baseline"
                v-text="getShareStatusText(resource.status)"
              />
            </div>
          </template>
        </oc-table-files>
      </div>

      <!-- Declined shares -->
      <div v-else>
        <div class="oc-app-bar shares-bar">
          <h2 key="declined-shares-header" v-translate>Declined Shares</h2>
          <div
            v-if="filterDataByStatus(activeFiles, shareStatus.declined).length > 0"
            class="oc-ml-s"
          >
            <p>({{ filterDataByStatus(activeFiles, shareStatus.declined).length }})</p>
          </div>
          <div class="oc-ml-m">
            <oc-button
              id="show-accepted"
              key="show-accepted-button"
              v-translate
              appearance="raw"
              @click="showDeclined = false"
              >Show accepted shares</oc-button
            >
          </div>
        </div>
        <no-content-message
          v-if="isEmpty || filterDataByStatus(activeFiles, shareStatus.declined).length === 0"
          id="files-shared-with-me-declined-empty"
          class="files-empty"
          icon="group"
        >
          <template #message>
            <span v-translate> No declined shares found </span>
          </template>
        </no-content-message>
        <oc-table-files
          v-else
          id="files-shared-with-me-declined-table"
          v-model="selected"
          class="files-table"
          :class="{ 'files-table-squashed': isSidebarOpen }"
          :are-previews-displayed="displayPreviews"
          :resources="filterDataByStatus(activeFiles, shareStatus.declined)"
          :target-route="targetRoute"
          :highlighted="highlightedFile ? highlightedFile.id : null"
          :header-position="headerPosition"
          @showDetails="setHighlightedFile"
          @fileClick="$_fileActions_triggerDefaultAction"
        >
          <template v-slot:status="{ resource }">
            <div
              :key="resource.id + resource.status"
              class="uk-text-nowrap uk-flex uk-flex-middle uk-flex-right"
            >
              <oc-button
                v-translate
                size="small"
                variation="success"
                class="file-row-share-status-action uk-text-meta"
                @click.stop="triggerShareAction(resource, 'POST')"
              >
                Accept
              </oc-button>
              <span
                class="uk-text-small oc-ml file-row-share-status-text uk-text-baseline"
                v-text="getShareStatusText(resource.status)"
              />
            </div>
          </template>
        </oc-table-files>
      </div>
    </template>
  </div>
</template>

<script>
import { mapGetters, mapState, mapActions, mapMutations } from 'vuex'
import { shareStatus } from '../helpers/shareStatus'
import { aggregateResourceShares, buildResource, buildSharedResource } from '../helpers/resources'
import FileActions from '../mixins/fileActions'
import MixinFilesListPositioning from '../mixins/filesListPositioning'
import ListLoader from '../components/ListLoader.vue'
import NoContentMessage from '../components/NoContentMessage.vue'
export default {
  components: { ListLoader, NoContentMessage },
  mixins: [FileActions, MixinFilesListPositioning],
  data: () => ({
    loading: true,
    shareStatus,
    showDeclined: false,
    showAllPending: false
  }),
  computed: {
    ...mapState(['app']),
    ...mapGetters('Files', [
      'davProperties',
      'highlightedFile',
      'activeFiles',
      'selectedFiles',
      'inProgress',
      'activeFilesCount'
    ]),
    ...mapGetters(['isOcis', 'configuration', 'getToken', 'user']),
    selected: {
      get() {
        return this.selectedFiles
      },
      set(resources) {
        this.SELECT_RESOURCES(resources)
      }
    },
    isEmpty() {
      return this.activeFiles.length < 1
    },
    isSidebarOpen() {
      return this.highlightedFile !== null
    },
    uploadProgressVisible() {
      return this.inProgress.length > 0
    },
    targetRoute() {
      return { name: 'files-personal' }
    },
    displayPreviews() {
      return !this.configuration.options.disablePreviews
    }
  },
  watch: {
    uploadProgressVisible() {
      this.adjustTableHeaderPosition()
    }
  },
  created() {
    this.loadResources()
    window.onresize = this.adjustTableHeaderPosition
  },
  mounted() {
    this.adjustTableHeaderPosition()
  },
  methods: {
    ...mapActions('Files', ['setHighlightedFile', 'loadIndicators', 'loadPreviews']),
    ...mapActions(['showMessage']),
    ...mapMutations('Files', [
      'LOAD_FILES',
      'SELECT_RESOURCES',
      'CLEAR_CURRENT_FILES_LIST',
      'UPDATE_RESOURCE'
    ]),
    ...mapMutations(['SET_QUOTA']),
    filterDataByStatus(data, status) {
      return data.filter(item => item.status === status)
    },
    async loadResources() {
      this.loading = true
      this.CLEAR_CURRENT_FILES_LIST()
      let resources = await this.$client.requests.ocs({
        service: 'apps/files_sharing',
        action: '/api/v1/shares?format=json&shared_with_me=true&state=all&include_tags=false',
        method: 'GET'
      })
      let rootFolder = await this.$client.files.fileInfo('/', this.davProperties)
      resources = await resources.json()
      resources = resources.ocs.data
      rootFolder = buildResource(rootFolder)
      if (resources.length < 1) {
        this.LOAD_FILES({ currentFolder: rootFolder, files: [] })
        this.loading = false
        return
      }
      resources = aggregateResourceShares(
        resources,
        true,
        !this.isOcis,
        this.configuration.server,
        this.getToken,
        this.$client,
        this.UPDATE_RESOURCE
      )
      this.LOAD_FILES({ currentFolder: rootFolder, files: resources })
      if (this.displayPreviews) {
        await this.loadPreviews({
          resources,
          isPublic: false,
          mediaSource: this.mediaSource,
          encodePath: this.encodePath,
          headers: this.requestHeaders
        })
      }
      // Load quota
      const user = await this.$client.users.getUser(this.user.id)
      this.SET_QUOTA(user.quota)
      this.loading = false
    },
    getShareStatusText(status) {
      switch (status) {
        case shareStatus.accepted:
          return this.$gettext('Accepted')
        case shareStatus.declined:
          return this.$gettext('Declined')
        case shareStatus.pending:
        default:
          return this.$gettext('Pending')
      }
    },
    async triggerShareAction(resource, type) {
      try {
        // exec share action
        let response = await this.$client.requests.ocs({
          service: 'apps/files_sharing',
          action: `api/v1/shares/pending/${resource.share.id}`,
          method: type
        })
        // exit on failure
        if (response.status !== 200) {
          throw new Error(response.statusText)
        }
        // get updated share from response or re-fetch it
        let share = null
        // oc10
        if (parseInt(response.headers.get('content-length')) > 0) {
          response = await response.json()
          if (response.ocs.data.length > 0) {
            share = response.ocs.data[0]
          }
        } else {
          // ocis
          const { shareInfo } = await this.$client.shares.getShare(resource.share.id)
          share = shareInfo
        }
        // update share in store
        if (share) {
          const sharedResource = await buildSharedResource(
            share,
            true,
            !this.isOcis,
            this.configuration.server,
            this.getToken
          )
          this.UPDATE_RESOURCE(sharedResource)
        }
      } catch (error) {
        this.loadResources()
        this.showMessage({
          title: this.$gettext('Error while changing share state'),
          desc: error.message,
          status: 'danger',
          autoClose: {
            enabled: true
          }
        })
      }
    }
  }
}
</script>

<style>
.centered {
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.shares-bar {
  display: flex;
  flex-direction: row;
  align-items: baseline;
}
#pending-highlight {
  background-color: #f0f8ff;
}
.show-hide-pending {
  text-align: center;
}
</style>
