---
trigger: always_on
---

Repository and Service Method Naming Convention
Objective

Standardize the naming of repository and service methods, especially for basic CRUD operations.

The goal is to ensure that basic operations have predictable and consistent names throughout the project, making the codebase easier to maintain, navigate, and understand.

This convention must not be applied to methods that represent business rules or entity/service-specific operations.

1. Repository

Every repository must use standardized names for basic CRUD operations.

The following method names are reserved for these operations:

create
update
delete
findAll
findById

These names should be used regardless of the entity being handled.

Example

For PackRepository:

class PackRepository {
create(data) {}
update(id, data) {}
delete(id) {}
findAll() {}
findById(id) {}
}

For UserRepository:

class UserRepository {
create(data) {}
update(id, data) {}
delete(id) {}
findAll() {}
findById(id) {}
}

Do not include the entity name in these basic CRUD methods.

Do not
createPack()
createUser()
updatePack()
deletePack()
findAllPacks()
findPackById()

Do
create()
update()
delete()
findAll()
findById()

The entity context is already defined by the repository itself.

2. Repository-Specific Methods

Methods that do not represent basic CRUD operations may use entity-specific or purpose-specific names and should clearly describe the intention of the operation.

These methods do not need to follow the create/update/delete/findAll/findById convention.

Examples:

findByEmail()
findBySlug()
findActiveUsers()
findByStatus()
countByOrganization()
findAvailablePacks()

The rule is:

Use the standardized names for generic CRUD operations. For specific operations, use a name that clearly describes the purpose of the operation.

Do not create artificial generic methods just to comply with the convention.

3. Services

services should follow a similar convention for basic operations, but the entity name must be included in the method name.

This makes it explicit which entity the service is operating on.

Basic operations

For a PackService, use:

createPack()
updatePack()
deletePack()
findManyPacks()
findPackById()

For a UserService:

createUser()
updateUser()
deleteUser()
findManyUsers()
findUserById()

For a ContentService:

createContent()
updateContent()
deleteContent()
findManyContents()
findContentById()

The naming convention should follow:

create<Entity>
update<Entity>
delete<Entity>
findMany<Entities>
find<Entity>ById

4. findMany in Services

Services should use findMany<Entity> to represent the basic operation of retrieving multiple entities.

Examples:

findManyUsers()
findManyPacks()
findManyContents()

Avoid inconsistent names for the same basic operation:

getUsers()
getAllUsers()
listUsers()
fetchUsers()
getManyUsers()

When the operation represents a basic retrieval of multiple entities, use:

findMany<Entity>()

5. Service-Specific Methods

The convention above should be applied only to basic CRUD operations.

Methods that represent business rules, workflows, or domain-specific operations should use names that clearly express their intent.

For example:

activateUser()
deactivateUser()
changeUserRole()
adjustUserPetals()
publishContent()
archiveContent()
duplicatePack()
calculatePackPrice()

These methods should not be artificially renamed to fit the CRUD convention.

For example, do not change:

changeUserRole()

to:

updateUser()

if the operation represents a specific business rule.

6. Update Variations

Specialized or partial update operations do not need to follow the basic CRUD naming convention.

For example:

updateUser()
updateUserRole()
updateUserPreferences()
updatePackStatus()
updateContentVisibility()

update<Entity> should represent the generic update operation for the entity.

Methods that represent specialized changes may have their own specific names.

The distinction should be:

Basic CRUD operation
↓
updateUser()

Specific business operation
↓
updateUserRole()
activateUser()
adjustUserPetals()

7. Do Not Create Duplicate Methods Just to Match the Convention

Do not create different methods that perform exactly the same operation simply to satisfy the naming convention.

For example, if the repository already has:

findById()

do not create:

findUserById()
getUser()
getUserById()

without a real architectural or business reason.

The purpose of this convention is to reduce inconsistency, not to increase the number of abstractions.

8. Decision Rule

When creating a new method, first determine whether it represents a basic CRUD operation.

If it is a basic CRUD operation:

Repository:

create
update
delete
findAll
findById

Service:

create<Entity>
update<Entity>
delete<Entity>
findMany<Entities>
find<Entity>ById

If it is not a basic CRUD operation:

Use a specific name that clearly describes the operation or business rule.

Examples:

findByEmail
findActiveUsers
changeUserRole
adjustUserPetals
publishContent
archiveContent

9. Rules for New Methods

When implementing or reviewing code:

Determine whether the method represents a basic CRUD operation.
If it represents a basic CRUD operation, the naming convention defined in this rule is mandatory.
If it is an entity-specific operation or business rule, use a descriptive and specific name.
Do not force domain-specific operations to use generic CRUD names.
Do not create duplicate methods solely to comply with the naming convention.
Keep naming consistent throughout the entire project.
Summary
Layer Create Update Delete Find Many Find by ID
Repository create update delete findAll findById
Service createEntity updateEntity deleteEntity findManyEntities findEntityById

This convention applies only to basic CRUD operations. Domain-specific methods, business rules, workflows, and specialized operation variants should retain their own descriptive and semantically meaningful names.
