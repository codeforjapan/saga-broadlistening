/**
 * トピック分析workerのBatchリソース名とARNを組み立てる純粋関数群。
 * TopicAnalysisStack（リソース作成側）とVercelOidcStack（SubmitJob権限付与側）の
 * 両方から参照する。VercelOidcStackがTopicAnalysisStackのARNをクロススタック参照
 * （Fn::ImportValue）すると、Job Definitionの更新でリビジョン番号付きARNが変わるたびに
 * 「export使用中のため更新不可」でTopicAnalysisStackのデプロイがロールバックするため、
 * 名前から直接ARNを組み立てる。
 */

export function topicAnalysisJobQueueName(envName: string): string {
  return `mirai-gikai-topic-analysis-${envName}`;
}

export function topicAnalysisJobDefinitionName(envName: string): string {
  return `mirai-gikai-topic-analysis-worker-${envName}`;
}

export type BatchArnParams = {
  partition: string;
  region: string;
  account: string;
  envName: string;
};

function batchArn(params: BatchArnParams, resource: string): string {
  const { partition, region, account } = params;
  return `arn:${partition}:batch:${region}:${account}:${resource}`;
}

/**
 * リビジョン番号を含まないJob Definition ARNを返す。SubmitJobにこの形式で渡すと
 * 最新のACTIVEリビジョンが使われるため、Job Definitionを更新してもadmin側の
 * 環境変数（TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN）を変更せずに済む。
 */
export function buildTopicAnalysisJobDefinitionArn(
  params: BatchArnParams
): string {
  return batchArn(
    params,
    `job-definition/${topicAnalysisJobDefinitionName(params.envName)}`
  );
}

/**
 * batch:SubmitJobを許可するResource ARNの一覧を返す。
 * Job Definitionはリビジョン無し・リビジョン付きの両形式を許可する。
 */
export function buildSubmitTopicAnalysisJobResourceArns(
  params: BatchArnParams
): string[] {
  const jobDefinitionArn = buildTopicAnalysisJobDefinitionArn(params);
  return [
    batchArn(params, `job-queue/${topicAnalysisJobQueueName(params.envName)}`),
    jobDefinitionArn,
    `${jobDefinitionArn}:*`,
  ];
}
