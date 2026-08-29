# Autenticação e autorização — FASE 3

## Modelo

A autenticação usa `express-session` com sessões persistidas no MySQL pela tabela `app_sessions`. O cookie guarda apenas o identificador opaco da sessão; dados de autenticação permanecem no servidor.

Configuração do cookie: `httpOnly`, `sameSite=lax`, `secure` em produção, expiração configurável e renovação enquanto estiver em uso. O `SESSION_SECRET` deve possuir pelo menos 32 caracteres, não pode ser o placeholder do exemplo e nunca deve ser versionado.

## Senhas e sessões

Senhas são armazenadas exclusivamente com bcrypt. `BCRYPT_ROUNDS` aceita 10–15 e a política inicial exige 12–128 caracteres. Mudança ou redefinição de senha incrementa `auth_version`, invalidando sessões antigas.

Alteração de status, cargos ou permissões diretas também incrementa `auth_version`, fazendo a nova autorização valer imediatamente nas próximas requisições.

Após 5 falhas consecutivas de um usuário conhecido, a conta fica bloqueada por 15 minutos. O login possui também limite local por IP contra rajadas. O sistema não informa se um username inexistente foi tentado. Na auditoria, o IP é armazenado somente como hash.

## Cargos e permissões acumuláveis

Um usuário pode possuir **vários cargos simultaneamente** pela relação `user_roles`.

Exemplo: um colaborador pode acumular os cargos `VENDEDOR` e `CAIXA`.

Além das permissões herdadas dos cargos, o usuário pode receber **permissões diretas** pela relação `user_permissions`.

O acesso efetivo é a união de:

1. permissões de todos os cargos ativos atribuídos ao usuário;
2. permissões diretas atribuídas especificamente ao usuário.

Permissões duplicadas são deduplicadas. Nesta etapa não existe regra de negação explícita: permissões diretas são sempre concessões adicionais.

Todo usuário ativo deve possuir ao menos um cargo ativo para autenticar. O último administrador ativo não pode perder o cargo `ADMINISTRADOR` nem ser desativado.

## Perfis iniciais

ADMINISTRADOR, GERENTE, VENDEDOR, CAIXA e ESTOQUE. As permissões de cada cargo são persistidas em `role_permissions`. As permissões diretas ficam em `user_permissions`. A autorização efetiva é conferida no backend a cada requisição autenticada.

## Primeiro administrador

Configure temporariamente `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_EMAIL` opcional e `ADMIN_PASSWORD`, execute `npm run auth:bootstrap-admin` e remova a senha do ambiente após a criação. O bootstrap só funciona quando não existe nenhum usuário; depois disso, novos administradores devem ser criados pelo fluxo autenticado.

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/password`
- `GET /api/users` (`users.read`)
- `POST /api/users` (`users.create`)
- `PATCH /api/users/:id` (`users.update`)
- `PATCH /api/users/:id/password` (`users.update`)
- `GET /api/users/meta/roles` (`roles.read`)
- `GET /api/users/meta/permissions` (`permissions.read`)

Na criação/edição de usuários, `roleIds` aceita uma lista de cargos e `permissionIds` aceita uma lista de permissões diretas. O campo legado `roleId` ainda é aceito como um único cargo para compatibilidade durante a transição.

Login, falhas, logout, mudança de senha, criação e alterações de usuários, cargos e permissões são auditados.
