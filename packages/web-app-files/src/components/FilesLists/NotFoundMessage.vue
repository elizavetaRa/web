<template>
  <div
    id="files-list-not-found-message"
    class="uk-text-center uk-flex-middle uk-flex uk-flex-center uk-flex-column"
  >
    <oc-icon name="cloud" type="div" size="xxlarge" />
    <div class="oc-text-muted uk-text-large">
      <translate>Resource not found</translate>
    </div>
    <div class="oc-text-muted">
      <translate>
        We went looking everywhere, but were unable to find the selected resource.
      </translate>
    </div>
    <div class="oc-mt-s">
      <oc-button
        v-if="showHomeButton"
        id="files-list-not-found-button-go-home"
        type="router-link"
        appearance="raw"
        :to="homeRoute"
      >
        <translate>Go to »All files«</translate>
      </oc-button>
      <oc-button
        v-if="showPublicLinkButton"
        id="files-list-not-found-button-reload-link"
        type="router-link"
        appearance="raw"
        :to="publicLinkRoute"
      >
        <translate>Reload public link</translate>
      </oc-button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import MixinRoutes from '../../mixins/routes'

export default {
  name: 'NotFoundMessage',
  mixins: [MixinRoutes],
  computed: {
    ...mapGetters(['homeFolder', 'configuration']),
    showHomeButton() {
      return this.isPersonalRoute
    },

    homeRoute() {
      return {
        name: 'files-personal',
        params: {
          item: this.homeFolder
        }
      }
    },

    showPublicLinkButton() {
      return this.isPublicFilesRoute
    },

    publicLinkRoute() {
      const item = this.$route.params.item.replace(/^\/+/, '')
      return {
        name: 'files-public-list',
        params: {
          item: item.split('/')[0]
        }
      }
    }
  }
}
</script>
