import type { ApiResponse } from "./rest.service";
import { restService } from "./rest.service";
import type { Subject, SubTopic, Topic } from "@/interfaces/subject.interface";

export const subjectService = {
  list: () => restService.get<ApiResponse<Subject[]>>("/subjects"),
  topicsBySubject: (subjectId: string) =>
    restService.get<ApiResponse<Topic[]>>(`/topics/subject/${subjectId}`),
  subTopicsByTopic: (topicId: string) =>
    restService.get<ApiResponse<SubTopic[]>>(`/sub-topics/topic/${topicId}`),
  subTopicsByTopics: (topicIds: string[]) =>
    restService.post<ApiResponse<SubTopic[]>>("/sub-topics/multi-topics", { topicIds }),
};
