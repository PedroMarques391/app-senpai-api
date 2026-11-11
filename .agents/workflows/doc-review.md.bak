---
description: Ao submeter um rascunho de rota, schema Zod ou documentação para a IA, execute o fluxo abaixo em 4 passos:
---

Workflow de Validação de Documentação de API
Objetivo

Validar se a documentação de um endpoint está 100% consistente com o backend, é suficiente para implementação no Flutter e permite que outro desenvolvedor integre e mantenha a rota sem depender do autor original.

A IA deve comparar a documentação com o código-fonte real, principalmente schemas Zod, DTOs, handlers/controllers e definição de autenticação.

Etapa 1 — Validação de Contrato
Foco

Zod Schema → DTO → Documentação → Dart

O que a IA deve validar

Comparar o contrato documentado com o schema Zod real e verificar:

Nome exato dos campos.
Tipo de cada campo.
Campos obrigatórios e opcionais.
nullable.
default.
Enums e seus valores permitidos.
min, max, length.
Regex e demais constraints.
UUIDs e outros formatos específicos.
Arrays e objetos aninhados.
Campos que podem ser null.
Diferença entre campo ausente e campo null.
Compatibilidade de tipos

A IA deve verificar se o tipo documentado possui equivalente direto em Dart.

Exemplos:

Zod Dart Validação
z.string() String OK
z.string().uuid() String OK + documentar UUID
z.number() num / double / int Verificar representação real
z.boolean() bool OK
z.enum([...]) enum Verificar todos os valores
z.date() DateTime Verificar serialização
z.array(z.string()) List<String> OK
z.string().nullable() String? Obrigatório verificar
.optional() campo opcional Verificar comportamento do JSON
Critério de aprovação

PASS: documentação representa exatamente o contrato do Zod.

FAIL: qualquer campo, tipo, enum, constraint, default ou nullable divergente.

Etapa 2 — Análise de Continuidade
Foco

O "por quê" da API

O que a IA deve validar

A documentação não deve apenas descrever o formato dos dados.

Ela deve explicar as regras de negócio necessárias para utilizar corretamente o endpoint.

A IA deve responder:

Se um desenvolvedor externo receber apenas essa documentação, ele consegue implementar a integração sem precisar perguntar ao autor original?

Verificar se está claro:

O objetivo do endpoint.
Quando ele deve ser chamado.
Por que ele existe no fluxo.
Pré-condições para utilizá-lo.
Efeitos colaterais relevantes.
Regras de negócio implícitas.
Relação com outros endpoints, quando relevante.
O que acontece após uma operação bem-sucedida.
Estados ou transições importantes.
Restrições que não podem ser inferidas apenas pelo tipo do campo.
Critério de aprovação

PASS: um desenvolvedor externo consegue entender quando e por que utilizar a rota.

FAIL: a documentação descreve apenas o contrato técnico, mas não explica regras de negócio necessárias para integração.

Etapa 3 — Compatibilidade Flutter
Foco

Integração e parsing no Flutter

O que a IA deve validar

Avaliar se o JSON retornado pela API pode ser consumido diretamente pelo Flutter ou se exige tratamento adicional.

Verificar especialmente:

camelCase vs snake_case.
Datas e timestamps.
ISO 8601.
null.
Enums.
Listas.
Objetos aninhados.
Paginação.
Campos opcionais.
Campos que podem mudar de tipo.
JSONs polimórficos.
Strings que representam números ou booleanos.
Estruturas que exigem conversão customizada.
Para cada campo problemático

A documentação deve deixar explícito o formato recebido.

Exemplo:

{
"createdAt": "2026-09-02T19:30:00.000Z"
}

Documentar:

createdAt é retornado como uma string ISO 8601 UTC e deve ser convertido para DateTime no Flutter.

Critério de aprovação

PASS: o desenvolvedor Flutter consegue criar o model/DTO sem precisar descobrir o formato através de tentativa e erro.

FAIL: existe parsing customizado necessário, mas a documentação não explica como o dado é serializado.

Etapa 4 — Linting de Erros e Edge Cases
Foco

Todos os caminhos relevantes de erro

O que a IA deve validar

Verificar se a documentação descreve os principais status HTTP e seus respectivos payloads.

No mínimo, quando aplicável:

400 Bad Request — falha de validação Zod/Fastify.
401 Unauthorized — autenticação ausente, inválida ou expirada.
403 Forbidden — usuário autenticado sem permissão.
404 Not Found — recurso inexistente.
409 Conflict — conflito de estado/dados, quando aplicável.
422 Unprocessable Entity — quando utilizado pelo backend.
500 Internal Server Error — quando relevante para o contrato público.
A IA deve validar

Para cada erro documentado:

Status HTTP.
Condição que provoca o erro.
Estrutura real do payload.
Nome dos campos do erro.
Mensagem retornada.
Código/tipo do erro, se existir.
Se o payload corresponde ao comportamento real do backend.
Critério de aprovação

PASS: os principais caminhos de erro estão documentados e os payloads correspondem ao backend real.

FAIL: a documentação informa apenas que "pode retornar 400", mas não informa o formato necessário para o cliente tratar o erro.

Template Padrão de Documentação
[MÉTODO] /caminho/do/endpoint
Descrição e Regra de Negócio

Explicação concisa:

O que o endpoint faz.
Por que ele existe.
Quando deve ser utilizado.
Regras de negócio relevantes.
Pré-condições, quando existirem.
Headers
Authorization: Bearer <token> — obrigatório.
Content-Type: application/json — obrigatório quando houver body.
Request Body

Baseado no Zod Schema real:

Campo Tipo Zod Equivalente Dart Obrigatório? Default Nullable? Descrição / Regra
userId z.string().uuid() String Sim — Não Identificador único do usuário
status z.enum([...]) UserStatusEnum Não PENDING Não Estado atual
Exemplo de Request
{
"userId": "123e4567-e89b-12d3-a456-426614174000",
"status": "PENDING"
}

Respostas
200 OK

Descrição do resultado da operação.

{
"id": "123e4567-e89b-12d3-a456-426614174000",
"status": "PENDING"
}

400 Bad Request

Falha de validação do schema Zod/Fastify.

{
"error": "ValidationError",
"message": "..."
}

401 Unauthorized

Token ausente, inválido ou expirado.

{
"error": "Unauthorized",
"message": "..."
}

403 Forbidden

Usuário autenticado, porém sem permissão para executar a operação.

{
"error": "Forbidden",
"message": "..."
}

404 Not Found

Recurso solicitado não encontrado.

{
"error": "NotFound",
"message": "..."
}

Resultado da Validação da IA

Ao finalizar a análise, a IA deve produzir:

Status

PASS ou FAIL

Contrato
PASS/FAIL
Divergências encontradas.
Regra de Negócio
PASS/FAIL
Informações ausentes.
Flutter
PASS/FAIL
Parsing customizado necessário.
Erros
PASS/FAIL
Status/payloads ausentes ou divergentes.
Problemas Encontrados

Listar somente problemas concretos, indicando:

Arquivo.
Endpoint/schema relacionado.
Campo ou comportamento afetado.
O que está documentado atualmente.
O que o código realmente faz.
Correção necessária.
Regra final

A documentação só deve ser considerada APROVADA quando:

O contrato corresponde ao Zod real.
As regras de negócio necessárias estão explicadas.
O JSON é suficientemente claro para integração Flutter.
Os principais erros e seus payloads estão documentados.
Não existem divergências entre documentação e implementação.
