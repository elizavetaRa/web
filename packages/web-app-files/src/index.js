import App from './App.vue'
import Personal from './views/Personal.vue'
import Favorites from './views/Favorites.vue'
import SharedWithMe from './views/SharedWithMe.vue'
import SharedWithOthers from './views/SharedWithOthers.vue'
import SharedViaLink from './views/SharedViaLink.vue'
import Trashbin from './views/Trashbin.vue'
import PrivateLink from './views/PrivateLink.vue'
import PublicLink from './views/PublicLink.vue'
import FilesDrop from './views/FilesDrop.vue'
import LocationPicker from './views/LocationPicker.vue'
import PublicFiles from './views/PublicFiles.vue'
import NoSelection from './components/SideBar/NoSelection.vue'
import FileDetails from './components/SideBar/Details/FileDetails.vue'
import FileDetailsMultiple from './components/SideBar/Details/FileDetailsMultiple.vue'
import FileActions from './components/SideBar/Actions/FileActions.vue'
import FileVersions from './components/SideBar/Versions/FileVersions.vue'
import FileShares from './components/SideBar/Shares/FileShares.vue'
import FileLinks from './components/SideBar/Links/FileLinks.vue'

import translationsJson from '../l10n/translations.json'
import quickActionsImport from './quickActions'
import store from './store'
import { isTrashbinRoute } from './helpers/route'
import { FilterSearch, SDKSearch } from './search'
import { bus } from 'web-pkg/src/instance'
import { Registry } from './services'

// just a dummy function to trick gettext tools
function $gettext(msg) {
  return msg
}

const appInfo = {
  name: $gettext('Files'),
  id: 'files',
  icon: 'folder',
  isFileEditor: false,
  extensions: [],
  fileSideBars: [
    // We don't have file details in the trashbin, yet.
    // Only allow `actions` panel on trashbin route for now.
    ({ rootFolder }) => ({
      app: 'no-selection-item',
      icon: 'info_outline',
      component: NoSelection,
      default: () => true,
      get enabled() {
        return rootFolder
      }
    }),
    ({ route, multipleSelection, rootFolder }) => ({
      app: 'details-item',
      icon: 'info_outline',
      component: FileDetails,
      default: !isTrashbinRoute(route),
      get enabled() {
        return !isTrashbinRoute(route) && !multipleSelection && !rootFolder
      }
    }),
    ({ multipleSelection, rootFolder }) => ({
      app: 'details-multiple-item',
      icon: 'info_outline',
      component: FileDetailsMultiple,
      default: () => true,
      get enabled() {
        return multipleSelection && !rootFolder
      }
    }),
    ({ route, multipleSelection, rootFolder }) => ({
      app: 'actions-item',
      component: FileActions,
      icon: 'slideshow',
      default: isTrashbinRoute(route),
      get enabled() {
        return !multipleSelection && !rootFolder
      }
    }),
    ({ capabilities, route, multipleSelection, rootFolder }) => ({
      app: 'sharing-item',
      icon: 'group',
      component: FileShares,
      get enabled() {
        if (multipleSelection || rootFolder) return false
        if (isTrashbinRoute(route)) {
          return false
        }

        if (capabilities.files_sharing) {
          return capabilities.files_sharing.api_enabled
        }
        return false
      }
    }),
    ({ capabilities, route, multipleSelection, rootFolder }) => ({
      app: 'links-item',
      icon: 'link',
      component: FileLinks,
      get enabled() {
        if (multipleSelection || rootFolder) return false
        if (isTrashbinRoute(route)) {
          return false
        }

        if (capabilities.files_sharing) {
          return capabilities.files_sharing.public.enabled
        }
        return false
      }
    }),
    ({ capabilities, highlightedFile, route, multipleSelection, rootFolder }) => ({
      app: 'versions-item',
      icon: 'file_version',
      component: FileVersions,
      get enabled() {
        if (multipleSelection || rootFolder) return false
        if (isTrashbinRoute(route)) {
          return false
        }
        return !!capabilities.core && highlightedFile && highlightedFile.type !== 'folder'
      }
    })
  ]
}
const navItems = [
  {
    name: $gettext('All files'),
    iconMaterial: appInfo.icon,
    route: {
      name: 'files-personal',
      path: `/${appInfo.id}/list/all`
    }
  },
  {
    name: $gettext('Favorites'),
    iconMaterial: 'star',
    route: {
      name: 'files-favorites',
      path: `/${appInfo.id}/list/favorites`
    },
    enabled(capabilities) {
      return capabilities.files && capabilities.files.favorites
    }
  },
  {
    name: $gettext('Shared with me'),
    iconMaterial: 'shared-with-me',
    route: {
      name: 'files-shared-with-me',
      path: `/${appInfo.id}/list/shared-with-me`
    }
  },
  {
    name: $gettext('Shared with others'),
    iconMaterial: 'shared-with-others',
    route: {
      name: 'files-shared-with-others',
      path: `/${appInfo.id}/list/shared-with-others`
    }
  },
  {
    name: $gettext('Shared via link'),
    iconMaterial: 'link',
    route: {
      name: 'files-shared-via-link',
      path: `/${appInfo.id}/list/shared-via-link`
    }
  },
  {
    name: $gettext('Deleted files'),
    iconMaterial: 'delete',
    enabled(capabilities) {
      return capabilities.dav && capabilities.dav.trashbin === '1.0'
    },
    route: {
      name: 'files-trashbin',
      path: `/${appInfo.id}/list/trash-bin`
    }
  }
]

const routes = [
  {
    path: '/',
    redirect: { name: 'files-personal' }
  },
  {
    name: 'list',
    path: '/list',
    redirect: { name: 'files-personal' },
    components: {
      app: App
    },
    children: [
      {
        name: 'personal',
        path: 'all/:item*',
        component: Personal,
        meta: {
          hasBulkActions: true,
          title: $gettext('All files')
        }
      },
      {
        name: 'favorites',
        path: 'favorites',
        component: Favorites,
        meta: {
          hideFilelistActions: true,
          hasBulkActions: true,
          title: $gettext('Favorite files')
        }
      },
      {
        path: 'shared-with-me',
        component: SharedWithMe,
        name: 'shared-with-me',
        meta: {
          hideFilelistActions: true,
          hasBulkActions: true,
          title: $gettext('Files shared with me')
        }
      },
      {
        path: 'shared-with-others',
        component: SharedWithOthers,
        name: 'shared-with-others',
        meta: {
          hideFilelistActions: true,
          hasBulkActions: true,
          title: $gettext('Files shared with others')
        }
      },
      {
        path: 'shared-via-link',
        component: SharedViaLink,
        name: 'shared-via-link',
        meta: {
          hideFilelistActions: true,
          hasBulkActions: true,
          title: $gettext('Files shared via link')
        }
      },
      {
        path: 'trash-bin',
        component: Trashbin,
        name: 'trashbin',
        meta: {
          hideFilelistActions: true,
          // FIXME: should have a generic bulk actions way as it currently handles this separately
          hasBulkActions: false,
          title: $gettext('Deleted files')
        }
      }
    ]
  },
  {
    name: 'public',
    path: '/public',
    components: {
      app: App
    },
    meta: {
      auth: false
    },
    children: [
      {
        name: 'public-list',
        path: 'list/:item*',
        component: PublicFiles,
        meta: {
          auth: false,
          hasBulkActions: true,
          title: $gettext('Public files')
        }
      }
    ]
  },
  {
    path: '/public-link/:token',
    name: 'public-link',
    components: {
      fullscreen: PublicLink
    },
    meta: {
      auth: false,
      hideHeadbar: true,
      title: $gettext('Resolving public link')
    }
  },
  {
    path: '/private-link/:fileId',
    name: 'private-link',
    components: {
      fullscreen: PrivateLink
    },
    meta: { hideHeadbar: true, title: $gettext('Resolving private link') }
  },
  {
    path: '/location-picker/:context/:action/:item*',
    name: 'location-picker',
    components: {
      app: LocationPicker
    },
    meta: {
      verbose: true,
      auth: false
    }
  },
  {
    path: '/files-drop/:token',
    name: 'public-drop',
    components: {
      app: FilesDrop
    },
    meta: { auth: false, title: $gettext('Public file upload') }
  }
]

// Prepare imported modules to be exported
// If we do not define these constants, the export will be undefined
const translations = translationsJson
const quickActions = quickActionsImport

// type: patch
// temporary patch till we have upgraded web to the latest vue router which make this obsolete
// this takes care that routes like 'foo/bar/baz' which by default would be converted to 'foo%2Fbar%2Fbaz' stay as they are
// should immediately go away and be removed after finalizing the update
const patchRouter = router => {
  // for now we only need the patch on following routes, if needed on more just extend
  // - files-personal: https://github.com/owncloud/web/issues/1883
  // - files-personal: https://github.com/owncloud/web/issues/4595
  // - files-public-list
  // - files-location-picker
  const activateForRoutes = ['files-personal', 'files-public-list', 'files-location-picker']
  const bindMatcher = router.match.bind(router)
  const cleanPath = route =>
    [
      ['%2F', '/'],
      ['//', '/']
    ].reduce((acc, rule) => acc.replaceAll(rule[0], rule[1]), route || '')

  router.match = (raw, current, redirectFrom) => {
    const bindMatch = bindMatcher(raw, current, redirectFrom)

    if (!activateForRoutes.includes(bindMatch.name)) {
      return bindMatch
    }

    return {
      ...bindMatch,
      path: cleanPath(bindMatch.path),
      fullPath: cleanPath(bindMatch.fullPath)
    }
  }
}

export default {
  appInfo,
  store,
  routes,
  navItems,
  quickActions,
  translations,
  mounted({ router: runtimeRouter, store: runtimeStore }) {
    patchRouter(runtimeRouter)
    Registry.filterSearch = new FilterSearch(runtimeStore, runtimeRouter)
    Registry.sdkSearch = new SDKSearch(runtimeStore, runtimeRouter)

    // when discussing the boot process of applications we need to implement a
    // registry that does not rely on call order, aka first register "on" and only after emit.
    bus.emit('app.search.register.provider', Registry.filterSearch)
    bus.emit('app.search.register.provider', Registry.sdkSearch)
  }
}
