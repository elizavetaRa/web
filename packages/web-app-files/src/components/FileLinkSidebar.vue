<template>
  <div id="oc-files-file-link" class="uk-position-relative">
    <div
      v-show="appSidebarAccordionContext === PANEL_SHOW"
      :key="PANEL_SHOW"
      :aria-hidden="appSidebarAccordionContext !== PANEL_SHOW"
    >
      <oc-loader v-if="linksLoading" :aria-label="$gettext('Loading list of file links')" />
      <template v-else>
        <private-link-item />
        <section>
          <h4 class="oc-text-bold oc-m-rm oc-text-initial">
            <translate>Public Links</translate>
          </h4>
          <div class="oc-text-muted">
            <i
              ><translate
                >Any external person with the respective link can access this resource. No sign-in
                required. Assign a password to avoid unintended document exposure.
              </translate>
            </i>
          </div>
          <div class="oc-mt-s oc-mb-s">
            <oc-button
              id="files-file-link-add"
              icon="add"
              variation="primary"
              :aria-label="$_addButtonAriaLabel"
              @click="addNewLink"
            >
              <oc-icon name="add" />
              {{ $_addButtonLabel }}
            </oc-button>
          </div>
          <transition-group
            class="uk-list uk-list-divider uk-overflow-hidden oc-m-rm"
            :enter-active-class="$_transitionGroupEnter"
            :leave-active-class="$_transitionGroupLeave"
            name="custom-classes-transition"
            tag="ul"
          >
            <li v-for="link in links" :key="link.key">
              <public-link-list-item :link="link" />
            </li>
          </transition-group>
        </section>
        <div v-if="$_noPublicLinks" key="oc-file-links-no-results">
          <translate>No public links</translate>
        </div>
      </template>
    </div>
    <div v-if="appSidebarAccordionContext === PANEL_EDIT" :key="PANEL_EDIT">
      <transition
        enter-active-class="uk-animation-slide-right uk-animation-fast"
        leave-active-class="uk-animation-slide-right uk-animation-reverse uk-animation-fast"
        name="custom-classes-transition"
      >
        <edit-public-link />
      </transition>
    </div>
  </div>
</template>
<script>
import { mapGetters, mapActions, mapState, mapMutations } from 'vuex'
import moment from 'moment'
import mixins from '../mixins'
import { shareTypes } from '../helpers/shareTypes'
import { getParentPaths } from '../helpers/path'
import { dirname } from 'path'
import { textUtils } from '../helpers/textUtils'
import { cloneStateObject } from '../helpers/store'
import PrivateLinkItem from './PublicLinksSidebar/PrivateLinkItem.vue'
import EditPublicLink from './PublicLinksSidebar/EditPublicLink.vue'
import PublicLinkListItem from './PublicLinksSidebar/PublicLinkListItem.vue'

const PANEL_SHOW = 'showLinks'
const PANEL_EDIT = 'editPublicLink'

export default {
  components: {
    EditPublicLink,
    PublicLinkListItem,
    PrivateLinkItem
  },
  mixins: [mixins],
  title: $gettext => {
    return $gettext('Links')
  },
  data() {
    return {
      // panel types
      PANEL_SHOW: PANEL_SHOW,
      PANEL_EDIT: PANEL_EDIT
    }
  },
  computed: {
    ...mapGetters('Files', [
      'highlightedFile',
      'currentFileOutgoingLinks',
      'currentFileOutgoingSharesLoading',
      'sharesTreeLoading'
    ]),
    ...mapGetters(['getToken', 'capabilities', 'configuration']),
    ...mapState('Files', ['sharesTree', 'appSidebarAccordionContext']),

    $_transitionGroupEnter() {
      return 'uk-animation-slide-left-medium'
    },
    $_transitionGroupLeave() {
      return 'uk-animation-slide-right-medium uk-animation-reverse'
    },

    linksLoading() {
      return this.currentFileOutgoingSharesLoading || this.sharesTreeLoading
    },

    links() {
      return [...this.currentFileOutgoingLinks, ...this.indirectLinks]
        .sort(this.linksComparator)
        .map(share => {
          share.key = 'direct-link-' + share.id
          return share
        })
    },

    indirectLinks() {
      const allShares = []
      const parentPaths = getParentPaths(this.highlightedFile.path, false)
      if (parentPaths.length === 0) {
        return []
      }

      // remove root entry
      parentPaths.pop()

      parentPaths.forEach(parentPath => {
        const shares = cloneStateObject(this.sharesTree[parentPath])
        if (shares) {
          shares.forEach(share => {
            if (share.outgoing && share.shareType === shareTypes.link) {
              share.key = 'indirect-link-' + share.id
              allShares.push(share)
            }
          })
        }
      })

      return allShares.sort(this.linksComparator)
    },

    $_noPublicLinks() {
      return this.links.length === 0
    },

    $_expirationDate() {
      const expireDate = this.capabilities.files_sharing.public.expire_date

      return {
        enabled: !!expireDate.enabled,
        days: expireDate.days ? expireDate.days : false,
        enforced: expireDate.enforced === '1'
      }
    },
    $_addButtonLabel() {
      return this.$gettext('Public link')
    },
    $_addButtonAriaLabel() {
      return this.$gettext('Create new public link')
    },
    currentPanel() {
      return this.appSidebarAccordionContext || PANEL_SHOW
    }
  },
  watch: {
    highlightedFile(newItem, oldItem) {
      if (oldItem !== newItem) {
        this.$_reloadLinks()
      }
    }
  },
  mounted() {
    this.$_reloadLinks()
  },

  beforeDestroy() {
    this.SET_APP_SIDEBAR_ACCORDION_CONTEXT(null)
  },

  methods: {
    ...mapActions('Files', ['loadSharesTree', 'loadCurrentFileOutgoingShares']),
    ...mapMutations('Files', ['TRIGGER_PUBLIC_LINK_CREATE', 'SET_APP_SIDEBAR_ACCORDION_CONTEXT']),

    $_showList() {
      this.SET_APP_SIDEBAR_ACCORDION_CONTEXT(PANEL_SHOW)
    },
    $_reloadLinks() {
      this.$_showList()
      this.loadCurrentFileOutgoingShares({
        client: this.$client,
        path: this.highlightedFile.path,
        $gettext: this.$gettext
      })
      this.loadSharesTree({
        client: this.$client,
        path: dirname(this.highlightedFile.path),
        $gettext: this.$gettext
      })
    },
    linksComparator(l1, l2) {
      // sorting priority 1: display name (lower case, ascending), 2: creation time (descending)
      const name1 = l1.name.toLowerCase().trim()
      const name2 = l2.name.toLowerCase().trim()
      const l1Direct = !l1.indirect
      const l2Direct = !l2.indirect

      if (l1Direct === l2Direct) {
        if (name1 === name2) {
          return l1.stime - l2.stime
        }

        return textUtils.naturalSortCompare(name1, name2)
      }

      return l1Direct ? -1 : 1
    },

    addNewLink() {
      this.TRIGGER_PUBLIC_LINK_CREATE({
        name: this.capabilities.files_sharing.public.defaultPublicLinkShareName,
        expireDate: this.$_expirationDate.days
          ? moment()
              .add(this.$_expirationDate.days, 'days')
              .endOf('day')
              .toISOString()
          : null
      })
    }
  }
}
</script>
<style scoped>
/* FIXME: Move to design system */
._clipboard-success-animation {
  animation-name: _clipboard-success-animation;
  animation-duration: 0.5s;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

@keyframes _clipboard-success-animation {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
  }
}
</style>
<style>
/* FIXME: Move to design system (copied from FileSharingSidebar.vue) */
.oc-app-side-bar .oc-label {
  display: block;
  margin-bottom: 5px;
}

.oc-app-side-bar .files-file-link-role-button {
  padding: 0 10px;
  text-align: left;
}

/** needed to cover the container below when transitioning */
.oc-app-side-bar .oc-default-background {
  background-color: white;
}
</style>
