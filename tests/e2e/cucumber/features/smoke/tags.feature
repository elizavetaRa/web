Feature: Users can use web to organize tags

  Background:
    Given "Admin" creates following users
      | id    |
      | Alice |
      | Brian |

  Scenario: Tag management
    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" uploads the following resource
      | resource  |
      | lorem.txt |
    And "Alice" adds the following tags for the following resources using the sidebar panel
      | resource  | tags         |
      | lorem.txt | Tag 1, Tag 2 |
    And the following resources should contain the following tags in the files list for user "Alice"
      | resource  | tags         |
      | lorem.txt | Tag 1, Tag 2 |
    And the following resources should contain the following tags in the details panel for user "Alice"
      | resource  | tags         |
      | lorem.txt | Tag 1, Tag 2 |
    And "Alice" removes the following tags for the following resources using the sidebar panel
      | resource  | tags  |
      | lorem.txt | Tag 1 |
    And the following resources should contain the following tags in the files list for user "Alice"
      | resource  | tags  |
      | lorem.txt | Tag 2 |
    And the following resources should contain the following tags in the details panel for user "Alice"
      | resource  | tags  |
      | lorem.txt | Tag 2 |
    And "Alice" logs out

  Scenario: Tags search
     When "Alice" logs in
     And "Alice" logs out

  Scenario: Tags sharing
    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" creates the following resources
      | resource         | type   |
      | folder_to_shared | folder |
    And "Alice" uploads the following resource
      | resource  | to               |
      | lorem.txt | folder_to_shared |
    And "Alice" adds the following tags for the following resources using the sidebar panel
      | resource                   | tags         |
      | folder_to_shared/lorem.txt | Tag 1, Tag 2 |
    When "Alice" shares the following resource using the sidebar panel
      | resource         | recipient | type | role   |
      | folder_to_shared | Brian     | user | editor |
    And "Alice" logs out
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" accepts the following share
      | name                 |
      | folder_to_shared     |
    And the following resources should contain the following tags in the files list for user "Brian"
      | resource                   | tags         |
      | folder_to_shared/lorem.txt | Tag 1, Tag 2 |
    And "Brian" logs out
