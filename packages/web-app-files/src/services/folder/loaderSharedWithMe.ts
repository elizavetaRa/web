import { FolderLoader, FolderLoaderTask, TaskContext } from '../folder'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import { aggregateResourceShares } from '@ownclouders/web-client/src/helpers/share'
import { isLocationSharesActive } from '@ownclouders/web-pkg'

export class FolderLoaderSharedWithMe implements FolderLoader {
  public isEnabled(): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    return isLocationSharesActive(router, 'files-shares-with-me')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { userStore, spacesStore, clientService, configStore, capabilityStore, resourcesStore } =
      context

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return useTask(function* (signal1, signal2) {
      resourcesStore.clearResourceList()
      resourcesStore.setAncestorMetaData({})

      if (configStore.options.routing.fullShareOwnerPaths) {
        yield spacesStore.loadMountPoints({ graphClient: clientService.graphAuthenticated })
      }

      let resources = yield clientService.owncloudSdk.shares.getShares('', {
        state: 'all',
        include_tags: false,
        shared_with_me: true,
        show_hidden: true
      })

      resources = resources.map((r) => r.shareInfo)

      if (resources.length) {
        resources = aggregateResourceShares({
          shares: resources,
          spaces: spacesStore.spaces,
          incomingShares: true,
          allowSharePermission: capabilityStore.sharingResharing,
          hasShareJail: capabilityStore.spacesShareJail,
          fullShareOwnerPaths: configStore.options.routing.fullShareOwnerPaths
        }).map((resource) => {
          // info: in oc10 we have no storageId in resources. All resources are mounted into the personal space.
          if (!resource.storageId) {
            resource.storageId = userStore.user.onPremisesSamAccountName
          }
          return resource
        })
      }

      resourcesStore.initResourceList({ currentFolder: null, resources })
    })
  }
}
