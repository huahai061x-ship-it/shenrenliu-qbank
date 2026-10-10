(()=>{
'use strict';
// Only source-page-checked candidates are eligible for use; all other proposals remain outside the app.
const candidates=[
  {
    "candidateId": "M-132",
    "sourceQuestionIds": [
      132
    ],
    "sourceImages": [
      33
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 3,
    "stem": "安装工件前，应检查工件表面有无______，并检查支架孔内有无______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "磕碰划伤",
        "accepted": [
          "磕碰划伤"
        ]
      },
      {
        "index": 2,
        "canonical": "毛刺",
        "accepted": [
          "毛刺"
        ]
      }
    ],
    "ordering": "fixed",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-133",
    "sourceQuestionIds": [
      133
    ],
    "sourceImages": [
      33
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 3,
    "stem": "班组召开一层级会议，需要安排______、______和______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "安全注意事项",
        "accepted": [
          "安全注意事项"
        ]
      },
      {
        "index": 2,
        "canonical": "质量关注点",
        "accepted": [
          "质量关注点"
        ]
      },
      {
        "index": 3,
        "canonical": "生产任务",
        "accepted": [
          "生产任务"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-134",
    "sourceQuestionIds": [
      134
    ],
    "sourceImages": [
      33
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 4,
    "stem": "正式生产前，需检查______、______、______和______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "设备",
        "accepted": [
          "设备"
        ]
      },
      {
        "index": 2,
        "canonical": "工具工装",
        "accepted": [
          "工具工装"
        ]
      },
      {
        "index": 3,
        "canonical": "工件配备",
        "accepted": [
          "工件配备"
        ]
      },
      {
        "index": 4,
        "canonical": "现场环境",
        "accepted": [
          "现场环境"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-135",
    "sourceQuestionIds": [
      135
    ],
    "sourceImages": [
      33,
      34
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 3,
    "stem": "使用KBK前，要目视检查有无______、______或______等异常。",
    "blanks": [
      {
        "index": 1,
        "canonical": "卡滞",
        "accepted": [
          "卡滞"
        ]
      },
      {
        "index": 2,
        "canonical": "磨损",
        "accepted": [
          "磨损"
        ]
      },
      {
        "index": 3,
        "canonical": "弯曲变形",
        "accepted": [
          "弯曲变形"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-136",
    "sourceQuestionIds": [
      136
    ],
    "sourceImages": [
      34
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 3,
    "stem": "吊装作业前，应检查吊具有无______、______或______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "裂纹",
        "accepted": [
          "裂纹"
        ]
      },
      {
        "index": 2,
        "canonical": "扭转变形",
        "accepted": [
          "扭转变形"
        ]
      },
      {
        "index": 3,
        "canonical": "凹槽",
        "accepted": [
          "凹槽"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-139",
    "sourceQuestionIds": [
      139
    ],
    "sourceImages": [
      34
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 3,
    "stem": "接收物料时，需检查来料的______、______和______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "外观质量",
        "accepted": [
          "外观质量"
        ]
      },
      {
        "index": 2,
        "canonical": "编号",
        "accepted": [
          "编号"
        ]
      },
      {
        "index": 3,
        "canonical": "数量",
        "accepted": [
          "数量"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "M-308",
    "sourceQuestionIds": [
      308
    ],
    "sourceImages": [
      74
    ],
    "evidence": "原始题干和原图标注的正确选项；不引入未出现在原题的扩展内容",
    "sourceReview": "已对照原图人工抽查",
    "kind": "multi_blank",
    "difficulty": 4,
    "stem": "汽车制造业四大工艺为______、______、______和______。",
    "blanks": [
      {
        "index": 1,
        "canonical": "冲压",
        "accepted": [
          "冲压"
        ]
      },
      {
        "index": 2,
        "canonical": "焊装",
        "accepted": [
          "焊装"
        ]
      },
      {
        "index": 3,
        "canonical": "涂装",
        "accepted": [
          "涂装"
        ]
      },
      {
        "index": 4,
        "canonical": "总装",
        "accepted": [
          "总装"
        ]
      }
    ],
    "ordering": "unordered_set",
    "scoring": "客观逐项核对；若unordered_set，用一对一最大匹配，不能重复使用同一答案；全对才算整题正确",
    "why": "填入原题列举的固定要素；不可将整句当作单空，也不可漏掉任何核心要素"
  },
  {
    "candidateId": "R-110",
    "sourceQuestionIds": [
      110
    ],
    "sourceImages": [
      27
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“自动化”的含义。",
    "standardAnswer": "引入专用机器、自动机器或机械手等机械设备，代替人执行作业。",
    "rubric": {
      "mandatoryPoints": [
        "以设备或机械替代人工",
        "专用机器/自动机器/机械手等作业设备"
      ],
      "criticalMisconceptions": [
        "把自働化的异常判断、自动停机能力当成自动化定义的必需内容"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-111",
    "sourceQuestionIds": [
      111
    ],
    "sourceImages": [
      27
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“自働化”的含义。",
    "standardAnswer": "把人的判断能力赋予机器，在出现异常时设备能报警并自行停止。",
    "rubric": {
      "mandatoryPoints": [
        "赋予设备异常判断能力",
        "异常发生时能够自动报警、停机"
      ],
      "criticalMisconceptions": [
        "仅写“机器代替人工”而未提异常判停"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-112",
    "sourceQuestionIds": [
      112
    ],
    "sourceImages": [
      27
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“均衡化”的含义。",
    "standardAnswer": "把产品的数量和种类进行平均化生产，也称平准化生产。",
    "rubric": {
      "mandatoryPoints": [
        "产品的数量进行平均化",
        "产品的种类进行平均化"
      ],
      "criticalMisconceptions": [
        "只提生产效率高而未说明数量和品种平均化"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-113",
    "sourceQuestionIds": [
      113
    ],
    "sourceImages": [
      28
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“标准作业”的含义。",
    "standardAnswer": "以人的动作为中心，按照企业认可且保证安全、质量、较少浪费、合理成本的方法进行作业，是操作人员须遵守的标准。",
    "rubric": {
      "mandatoryPoints": [
        "以人的动作为中心",
        "按经过认可的标准方法作业",
        "兼顾安全、质量与浪费/成本"
      ],
      "criticalMisconceptions": [
        "仅说“按照标准干活”，缺核心限定条件"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-114",
    "sourceQuestionIds": [
      114
    ],
    "sourceImages": [
      28
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“作业标准”的含义。",
    "standardAnswer": "作业者实施操作必须遵守的各项标准，包括作业要领书、作业指导书、检查要领书等文件。",
    "rubric": {
      "mandatoryPoints": [
        "作业者实施操作必须遵守的标准",
        "包含作业要领书、作业指导书、检查要领书等文件"
      ],
      "criticalMisconceptions": [
        "将标准作业与作业标准视为完全相同的定义"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-115",
    "sourceQuestionIds": [
      115
    ],
    "sourceImages": [
      28
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“生产节拍”的含义。",
    "standardAnswer": "工厂或车间按市场销售需求、生产台数与运转时间决定的每件产品目标生产时间。",
    "rubric": {
      "mandatoryPoints": [
        "每件产品的目标时间值",
        "由生产数量/市场需求与运转时间决定"
      ],
      "criticalMisconceptions": [
        "与实际完成一轮作业的循环时间混淆"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-116",
    "sourceQuestionIds": [
      116
    ],
    "sourceImages": [
      29
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“循环时间”的含义。",
    "standardAnswer": "一名操作者在所负责工序中，按照作业顺序完成一个作业循环所需的时间。",
    "rubric": {
      "mandatoryPoints": [
        "一名操作者在负责的工序中",
        "按作业顺序完成一个循环所需的实际时间"
      ],
      "criticalMisconceptions": [
        "写成由市场需求决定的目标生产时间"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-117",
    "sourceQuestionIds": [
      117
    ],
    "sourceImages": [
      29
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“作业顺序”的含义。",
    "standardAnswer": "为安全、高效率地生产合格品，作业者应遵循的操作先后次序。",
    "rubric": {
      "mandatoryPoints": [
        "规定操作者动作的先后次序",
        "目标是安全、高效生产合格品"
      ],
      "criticalMisconceptions": [
        "解释成工序中的最少在制品数量"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "R-118",
    "sourceQuestionIds": [
      118
    ],
    "sourceImages": [
      29
    ],
    "sourceReview": "已对照原图人工抽查",
    "kind": "reverse_definition",
    "difficulty": 4,
    "stem": "请解释“标准手持”的含义。",
    "standardAnswer": "为保证生产线按节拍、按顺序重复作业，在工序内必须持有的最少在制品数量。",
    "rubric": {
      "mandatoryPoints": [
        "工序内的在制品数量",
        "是维持节拍和重复作业的最少数量"
      ],
      "criticalMisconceptions": [
        "解释成工序间额外缓冲库存"
      ],
      "scoreScheme": "每点1分；全点齐备=掌握；至少半数=部分掌握；严重概念性错误=未掌握（由用户自评）"
    },
    "autoGrade": false,
    "why": "原选择题用定义考概念名；反过来由概念名考定义，得分点仅取原题明确表述的内容"
  },
  {
    "candidateId": "F-174",
    "sourceQuestionIds": [
      174
    ],
    "sourceImages": [
      42,
      43
    ],
    "sourceReview": "已对照原图人工抽查（跨页）",
    "kind": "full_recall",
    "difficulty": 4,
    "stem": "请完整写出现场5S的五个要素。",
    "standardAnswer": "整理、整顿、清扫、清洁、素养",
    "rubric": {
      "mandatoryPoints": [
        "整理",
        "整顿",
        "清扫",
        "清洁",
        "素养"
      ],
      "unordered": true,
      "scoreScheme": "5/5掌握；3-4/5部分掌握；0-2/5未掌握；错字不得自动当作等价术语"
    },
    "autoGrade": false,
    "why": "五项全部来自原图正确答案；不适用最多4空的MultiBlank Ultra题型"
  }
];
candidates.forEach(candidate=>{candidate.reviewStatus='verified';});
candidates.push(...[
  {
    "candidateId": "C-110",
    "sourceQuestionIds": [
      110
    ],
    "sourceImages": [
      27
    ],
    "knowledgeKey": "automation",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图110：设备代替人作业；不要混入自働化的异常判停。",
    "stem": "“自动化”以专用机器、自动机器或机械手等______，代替______执行作业。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "机械设备",
        "accepted": [
          "机械设备"
        ]
      },
      {
        "index": 2,
        "canonical": "人",
        "accepted": [
          "人",
          "人工"
        ]
      }
    ],
    "why": "原图110：设备代替人作业；不要混入自働化的异常判停。"
  },
  {
    "candidateId": "C-111",
    "sourceQuestionIds": [
      111
    ],
    "sourceImages": [
      27
    ],
    "knowledgeKey": "automation",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图111：人的智慧、异常警报及自行停止；只答设备代替人工不成立。",
    "stem": "“自働化”把人的______赋予机器；异常时设备会发出______并自行______。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "智慧",
        "accepted": [
          "智慧",
          "判断能力"
        ]
      },
      {
        "index": 2,
        "canonical": "警报",
        "accepted": [
          "警报"
        ]
      },
      {
        "index": 3,
        "canonical": "停止",
        "accepted": [
          "停止",
          "停机"
        ]
      }
    ],
    "why": "原图111：人的智慧、异常警报及自行停止；只答设备代替人工不成立。"
  },
  {
    "candidateId": "C-112",
    "sourceQuestionIds": [
      112
    ],
    "sourceImages": [
      27,
      28
    ],
    "knowledgeKey": "leveling",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图112及28页正确选项：数量、种类均需平均化。",
    "stem": "“均衡化”对产品的______和______进行平均化生产，也称平准化生产。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "数量",
        "accepted": [
          "数量"
        ]
      },
      {
        "index": 2,
        "canonical": "种类",
        "accepted": [
          "种类",
          "品种"
        ]
      }
    ],
    "why": "原图112及28页正确选项：数量、种类均需平均化。"
  },
  {
    "candidateId": "C-113",
    "sourceQuestionIds": [
      113
    ],
    "sourceImages": [
      28
    ],
    "knowledgeKey": "standard-work",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图113：以人的动作为中心、企业认可；不得与文件意义的作业标准混淆。",
    "stem": "“标准作业”以人的______为中心，方法必须经过______认可；目标包括安全、质量、较少浪费和合理成本。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "动作",
        "accepted": [
          "动作"
        ]
      },
      {
        "index": 2,
        "canonical": "企业",
        "accepted": [
          "企业"
        ]
      }
    ],
    "why": "原图113：以人的动作为中心、企业认可；不得与文件意义的作业标准混淆。"
  },
  {
    "candidateId": "C-115",
    "sourceQuestionIds": [
      115
    ],
    "sourceImages": [
      28
    ],
    "knowledgeKey": "takt-cycle",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图115：每件产品的目标时间，由需求、生产台数及运转时间决定；区别于循环时间。",
    "stem": "“生产节拍”是生产一件产品的______时间值，由市场销售需求、生产______和______时间决定。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "目标",
        "accepted": [
          "目标"
        ]
      },
      {
        "index": 2,
        "canonical": "台数",
        "accepted": [
          "台数",
          "数量"
        ]
      },
      {
        "index": 3,
        "canonical": "运转",
        "accepted": [
          "运转"
        ]
      }
    ],
    "why": "原图115：每件产品的目标时间，由需求、生产台数及运转时间决定；区别于循环时间。"
  },
  {
    "candidateId": "C-118",
    "sourceQuestionIds": [
      118
    ],
    "sourceImages": [
      29
    ],
    "knowledgeKey": "takt-cycle",
    "kind": "concept_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图118：工序内最少的在制品数量；不是工序间的额外库存。",
    "stem": "“标准手持”是在______内持有的最少______数量，以保证生产线按节拍、按作业顺序重复作业。",
    "ordering": "fixed",
    "blanks": [
      {
        "index": 1,
        "canonical": "工序",
        "accepted": [
          "工序"
        ]
      },
      {
        "index": 2,
        "canonical": "在制品",
        "accepted": [
          "在制品"
        ]
      }
    ],
    "why": "原图118：工序内最少的在制品数量；不是工序间的额外库存。"
  },
  {
    "candidateId": "M-175",
    "sourceQuestionIds": [
      175
    ],
    "sourceImages": [
      43
    ],
    "knowledgeKey": "safety-day",
    "kind": "multi_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图175仅15日、28日为正确选项。",
    "stem": "月安全活动日的两个开展日期为每月______日和______日。",
    "ordering": "unordered_set",
    "blanks": [
      {
        "index": 1,
        "canonical": "15",
        "accepted": [
          "15"
        ]
      },
      {
        "index": 2,
        "canonical": "28",
        "accepted": [
          "28"
        ]
      }
    ],
    "why": "原图175仅15日、28日为正确选项。"
  },
  {
    "candidateId": "M-176",
    "sourceQuestionIds": [
      176
    ],
    "sourceImages": [
      43
    ],
    "knowledgeKey": "three-violations",
    "kind": "multi_blank",
    "difficulty": 4,
    "reviewStatus": "verified",
    "sourceReview": "已对照原图人工抽查（2026-10-10逐项核对）",
    "evidence": "原图176三个正确项；“违反标准作业”不是该题正确选项。",
    "stem": "班组“反三违”反对______、______和______。",
    "ordering": "unordered_set",
    "blanks": [
      {
        "index": 1,
        "canonical": "违章指挥",
        "accepted": [
          "违章指挥"
        ]
      },
      {
        "index": 2,
        "canonical": "违章作业",
        "accepted": [
          "违章作业"
        ]
      },
      {
        "index": 3,
        "canonical": "违反劳动纪律",
        "accepted": [
          "违反劳动纪律"
        ]
      }
    ],
    "why": "原图176三个正确项；“违反标准作业”不是该题正确选项。"
  }
]);
window.ULTRA_CANDIDATES=Object.freeze(candidates);
})();
