import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

// 댓글 저장소 — DynamoDB. AWS Lambda가 쓴다. d1Store와 메서드 모양이 같다.
// 댓글 표: 파티션 post_slug + 정렬 id. LSI by_created의 정렬 키 sort = "<created_at 13자리>#<id>" — SQL의 (created_at, id) 내림차순과 같은 순서다.
// 제한 표: 키 key, hits, expires_at(ms). ttl(초)로 DynamoDB TTL이 지운다.
const S = value => ({ S: String(value) }), N = value => ({ N: String(value) });
const sortKey = (createdAt, id) => `${String(createdAt).padStart(13, '0')}#${id}`;
const fromItem = item => item && { id: item.id.S, post_slug: item.post_slug.S, name: item.name.S, body: item.body.S, password_hash: item.password_hash?.S, salt: item.salt?.S, created_at: Number(item.created_at.N), updated_at: Number(item.updated_at.N) };
const publicRow = ({ password_hash, salt, ...row }) => row;
const unlessChanged = async send => { try { await send(); return true; } catch (error) { if (error instanceof ConditionalCheckFailedException || error.name === 'ConditionalCheckFailedException') return false; throw error; } };

export function dynamoStore({ commentsTable, limitsTable, client = new DynamoDBClient({}) }) {
  const get = async (id, slug) => fromItem((await client.send(new GetItemCommand({ TableName: commentsTable, Key: { post_slug: S(slug), id: S(id) }, ConsistentRead: true }))).Item);
  return {
    async list(slug, cursor) {
      const result = await client.send(new QueryCommand({ TableName: commentsTable, IndexName: 'by_created', ConsistentRead: true, ScanIndexForward: false, Limit: 21,
        KeyConditionExpression: cursor ? 'post_slug = :slug AND #sort < :cursor' : 'post_slug = :slug', ExpressionAttributeNames: cursor ? { '#sort': 'sort' } : undefined,
        ExpressionAttributeValues: { ':slug': S(slug), ...(cursor ? { ':cursor': S(sortKey(cursor.time, cursor.id)) } : {}) } }));
      return result.Items.map(item => publicRow(fromItem(item)));
    },
    async count(slug) {
      let total = 0, start;
      do {
        const page = await client.send(new QueryCommand({ TableName: commentsTable, Select: 'COUNT', ConsistentRead: true, KeyConditionExpression: 'post_slug = :slug', ExpressionAttributeValues: { ':slug': S(slug) }, ExclusiveStartKey: start }));
        total += page.Count; start = page.LastEvaluatedKey;
      } while (start);
      return total;
    },
    // D1의 find는 글과 무관하게 id로 찾는다. 여기서는 키가 (글, id)라 요청의 글로 찾는다 — 다른 글에 같은 id가 있으면 별개 댓글로 저장된다.
    find: get,
    findInPost: get,
    async insert(row) {
      await client.send(new PutItemCommand({ TableName: commentsTable, ConditionExpression: 'attribute_not_exists(id)', Item: {
        post_slug: S(row.post_slug), id: S(row.id), sort: S(sortKey(row.created_at, row.id)), name: S(row.name), body: S(row.body),
        password_hash: S(row.password_hash), salt: S(row.salt), created_at: N(row.created_at), updated_at: N(row.updated_at) } }));
    },
    update(id, slug, updatedAt, { name, body, updated_at }) {
      return unlessChanged(() => client.send(new UpdateItemCommand({ TableName: commentsTable, Key: { post_slug: S(slug), id: S(id) },
        UpdateExpression: 'SET #name = :name, #body = :body, updated_at = :next', ConditionExpression: 'updated_at = :current', ExpressionAttributeNames: { '#name': 'name', '#body': 'body' },
        ExpressionAttributeValues: { ':name': S(name), ':body': S(body), ':next': N(updated_at), ':current': N(updatedAt) } })));
    },
    remove(id, slug, updatedAt) {
      return unlessChanged(() => client.send(new DeleteItemCommand({ TableName: commentsTable, Key: { post_slug: S(slug), id: S(id) }, ConditionExpression: 'updated_at = :current', ExpressionAttributeValues: { ':current': N(updatedAt) } })));
    },
    async hit(key, now, expiresAt) {
      const result = await client.send(new UpdateItemCommand({ TableName: limitsTable, Key: { key: S(key) }, ReturnValues: 'UPDATED_NEW',
        UpdateExpression: 'ADD hits :one SET expires_at = if_not_exists(expires_at, :expires), #ttl = if_not_exists(#ttl, :ttl)', ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': N(1), ':expires': N(expiresAt), ':ttl': N(Math.ceil(expiresAt / 1000)) } }));
      return Number(result.Attributes.hits.N);
    },
  };
}
