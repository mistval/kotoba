const reload = require('require-reload')(require);
const Conjugator = require('jp-verbs');

const { PublicError } = reload('monochrome-bot');
const constants = reload('./../common/constants.js');
const { throwPublicErrorInfo } = reload('./../common/util/errors.js');

const titleForDerivationStep = {};
titleForDerivationStep[Conjugator.WordType.POLITE_MASU] = 'ます Polite';
titleForDerivationStep[Conjugator.WordType.POLITE_DESU_VERB] = 'です Polite';
titleForDerivationStep[Conjugator.WordType.POLITE_MASEN] = 'ません Polite Negative';
titleForDerivationStep[Conjugator.WordType.POLITE_MASEN_DESHITA] = 'ませんでした Polite Negative Past';
titleForDerivationStep[Conjugator.WordType.POLITE_MASHITA] = 'ました Polite past';
titleForDerivationStep[Conjugator.WordType.POLITE_MASHOU] = 'ましょう Polite Volitional';
titleForDerivationStep[Conjugator.WordType.NEGATIVE_NAI_VERB] = 'ない Negative';
titleForDerivationStep[Conjugator.WordType.PLAIN_PAST] = 'Plain Past';
titleForDerivationStep[Conjugator.WordType.TE_FORM] = 'て・で Form';
titleForDerivationStep[Conjugator.WordType.POTENTIAL] = 'Potential Form';
titleForDerivationStep[Conjugator.WordType.POTENTIAL_PASSIVE] = 'Potential Or Passive Form';
titleForDerivationStep[Conjugator.WordType.PASSIVE] = 'Passive Form';
titleForDerivationStep[Conjugator.WordType.BA_FORM] = 'ば Conditional Form';
titleForDerivationStep[Conjugator.WordType.IMPERATIVE] = 'Imperative Form';
titleForDerivationStep[Conjugator.WordType.VOLITIONAL] = 'Volitional Form';
titleForDerivationStep[Conjugator.WordType.MASU_STEM] = 'ます Stem';
titleForDerivationStep[Conjugator.WordType.HEARSAY] = 'そう Hearsay Form';
titleForDerivationStep[Conjugator.WordType.CAUSATIVE] = 'Causative Form';
titleForDerivationStep[Conjugator.WordType.SHORTENED_CAUSATIVE] = 'Shortened Causative Form';
titleForDerivationStep[Conjugator.WordType.TARA] = 'たら Conditional Form';
titleForDerivationStep[Conjugator.WordType.NAKYA] = 'なきゃ Casual "Must Do"';
titleForDerivationStep[Conjugator.WordType.NAKUCHA] = 'なくちゃ Casual "Must Do"';
titleForDerivationStep[Conjugator.WordType.AGEKU] = 'あげく・挙句 After Great Trouble';
titleForDerivationStep[Conjugator.WordType.TAI] = 'たい Want To Do';
titleForDerivationStep[Conjugator.WordType.APPEARANCE] = 'そう Appearance Form';
titleForDerivationStep[Conjugator.WordType.NAIDE] = 'ないで Without Doing';
titleForDerivationStep[Conjugator.WordType.NA_COMMAND] = 'な Negative Command (Do Not Do)';
titleForDerivationStep[Conjugator.WordType.NEGATIVE_VOLITIONAL] = 'まい Negative Volitional';
titleForDerivationStep[Conjugator.WordType.NASAI] = 'なさい Polite But Firm Command';
titleForDerivationStep[Conjugator.WordType.ZU] = 'ず Without Doing';
titleForDerivationStep[Conjugator.WordType.ADVERB] = 'く Adverbification';
titleForDerivationStep[Conjugator.WordType.WA_PARTICLE] = 'は Particle';
titleForDerivationStep[Conjugator.WordType.IRU] = 'ている・でいる Continuing State/Result';
titleForDerivationStep[Conjugator.WordType.ARU] = 'てある・である Form';
titleForDerivationStep[Conjugator.WordType.ORU] = 'ておる・でおる Form';
titleForDerivationStep[Conjugator.WordType.KUDASAI] = 'ください Polite Request';
titleForDerivationStep[Conjugator.WordType.NU] = 'ぬ Archaic Negative';
titleForDerivationStep[Conjugator.WordType.FEMININE_WA_PARTICLE] = 'わ Feminine Emphasis Particle';
titleForDerivationStep[Conjugator.WordType.YO_PARTICLE] = 'よ Emphasis Particle';
titleForDerivationStep[Conjugator.WordType.NE_PARTICLE] = 'ね Agreement Seeking Particle';
titleForDerivationStep[Conjugator.WordType.NA_PARTICLE] = 'な Masculine Emphasis Particle';
titleForDerivationStep[Conjugator.WordType.ZO_PARTICLE] = 'ぞ Rough/Casual Emphasis Particle';
titleForDerivationStep[Conjugator.WordType.ZE_PARTICLE] = 'ぜ Rough/Casual Emphasis Particle';
titleForDerivationStep[Conjugator.WordType.KA_PARTICLE] = 'か Question Particle';
titleForDerivationStep[Conjugator.WordType.GA_PARTICLE] = 'が But';
titleForDerivationStep[Conjugator.WordType.SA_PARTICLE] = 'さ Emphasis/Filler Particle';
titleForDerivationStep[Conjugator.WordType.MADE_PARTICLE] = 'まで Until';
titleForDerivationStep[Conjugator.WordType.KARA_PARTICLE] = 'から Since, From';
titleForDerivationStep[Conjugator.WordType.KEDO_PARTICLE] = 'けど・けれど・けれども But';
titleForDerivationStep[Conjugator.WordType.NONI_PARTICLE] = 'のに Even Though, Despite';
titleForDerivationStep[Conjugator.WordType.POLITE_DESHOU] = 'でしょう Polite "Probably"';
titleForDerivationStep[Conjugator.WordType.DAROU] = 'だろう Probably';
titleForDerivationStep[Conjugator.WordType.POLITE_ITADAKU] = 'いただく Polite/Humble Receive Favor';
titleForDerivationStep[Conjugator.WordType.MORAU] = 'もらう Casual Receive Favor';
titleForDerivationStep[Conjugator.WordType.BEKI] = 'べき Must Do';
titleForDerivationStep[Conjugator.WordType.OKU] = 'ておく・でおく To Do Something In Preparation';
titleForDerivationStep[Conjugator.WordType.KURERU] = 'くれる To Give (Toward Speaker)';
titleForDerivationStep[Conjugator.WordType.AGERU] = 'あげる To Give (Away From Speaker)';
titleForDerivationStep[Conjugator.WordType.WA_AFTER_TE] = 'は Particle';
titleForDerivationStep[Conjugator.WordType.MO_AFTER_TE] = 'も Particle (Even, Even If)';
titleForDerivationStep[Conjugator.WordType.II] = 'いい Good, Okay';
titleForDerivationStep[Conjugator.WordType.DA] = 'だ Copula';
titleForDerivationStep[Conjugator.WordType.OCCASIONAL_OCCURANCE_ARU] = 'ことがある Occasional Occurance ・ It Happens Sometimes';
titleForDerivationStep[Conjugator.WordType.EXPLANATORY_NO_PARTICLE] = 'の Explanatory Particle';
titleForDerivationStep[Conjugator.WordType.KOTO_NOMINALIZER] = 'こと Nominalizer';
titleForDerivationStep[Conjugator.WordType.KOTO_NI_SURU] = 'ことにする Decide To Do ・ Settle On Doing';
titleForDerivationStep[Conjugator.WordType.KOTO_NI_NARU] = 'ことになる Has Been Decided ・ Has Become The Case';
titleForDerivationStep[Conjugator.WordType.MAE] = '前・まえ Before Doing';
titleForDerivationStep[Conjugator.WordType.GA_HAYAI_KA] = 'が早いか As Soon As';
titleForDerivationStep[Conjugator.WordType.MITAI] = 'みたい Looks Like ・ Seems Like';
titleForDerivationStep[Conjugator.WordType.RASHII] = 'らしい Looks Like ・ Seems Like';
titleForDerivationStep[Conjugator.WordType.GARU] = 'がる Appearing To Want';
titleForDerivationStep[Conjugator.WordType.MASU_STEM_WA_SHINAI] = 'ます Stem しない Strong Emphasis On Not Doing';
titleForDerivationStep[Conjugator.WordType.NAGARA] = 'ながら While';
titleForDerivationStep[Conjugator.WordType.GACHI] = 'がち Prone To ・ Unfortunate Tendency';
titleForDerivationStep[Conjugator.WordType.KATA] = '方・かた Way Of Doing';
titleForDerivationStep[Conjugator.WordType.NIKUI] = 'にくい Difficult To Do';
titleForDerivationStep[Conjugator.WordType.YASUI] = 'やすい Easy To Do';
titleForDerivationStep[Conjugator.WordType.SUGI] = '過ぎ・すぎ Overdoing';
titleForDerivationStep[Conjugator.WordType.SUGIRU] = '過ぎる・すぎる Overdoing';
titleForDerivationStep[Conjugator.WordType.MASU_STEM_NI] = 'ます Stem に Going To Do';
titleForDerivationStep[Conjugator.WordType.NAKUTE_NAKEREBA_IKENAI_NARANAI] = 'なくて・なければ + いけない・ならない Must Do';
titleForDerivationStep[Conjugator.WordType.TE_IKENAI_NARANAI] = 'ていけない・てならない Must Not Do';
titleForDerivationStep[Conjugator.WordType.TE_DAME] = 'だめ・駄目 Bad ・ Should Not';
titleForDerivationStep[Conjugator.WordType.NAKUTE_NAKEREBA_DAME] = 'なくて・なければ + だめ・駄目 Must Do';
titleForDerivationStep[Conjugator.WordType.SHIMAU] = 'しまう To Do Unfortunately ・ To Do Completely';
titleForDerivationStep[Conjugator.WordType.CHAU] = 'ちゃう Casual Contraction Of てしまう';
titleForDerivationStep[Conjugator.WordType.MIRU] = 'みる To Try To Do';
titleForDerivationStep[Conjugator.WordType.HOSHII] = 'ほしい・欲しい To Want Someone To Do Something';
titleForDerivationStep[Conjugator.WordType.TE_KARA] = 'から Since, After';
titleForDerivationStep[Conjugator.WordType.TE_KURU] = 'てくる・でくる Gradual Change (Toward Speaker)';
titleForDerivationStep[Conjugator.WordType.TE_IKU] = 'ていく・でいく Gradual Change (Away From Speaker)';
titleForDerivationStep[Conjugator.WordType.KAMAU] = 'かまう To Mind ・ To Care';
titleForDerivationStep[Conjugator.WordType.SUMANAI] = 'すまない Sorry!';
titleForDerivationStep[Conjugator.WordType.SUMIMASEN] = 'すみません Polite Sorry';
titleForDerivationStep[Conjugator.WordType.JIMAU] = 'じまう Casual Contraction Of でしまう';
titleForDerivationStep[Conjugator.WordType.CHIMAU] = 'ちまう Casual Contraction Of てしまう';
titleForDerivationStep[Conjugator.WordType.JAU] = 'じゃう Casual Contraction Of でしまう';
titleForDerivationStep[Conjugator.WordType.TARI] = 'たり Et Cetera';
titleForDerivationStep[Conjugator.WordType.TA_BAKARI] = 'たばかり・だばかり To Have Just Done';
titleForDerivationStep[Conjugator.WordType.HOU_GA_II] = 'ほうがいい Better ・ Preferable';
titleForDerivationStep[Conjugator.WordType.YOU] = 'よう Appearance ・ It Seems That Way';
titleForDerivationStep[Conjugator.WordType.HAZU] = 'はず Expectation';
titleForDerivationStep[Conjugator.WordType.NARU] = 'なる To Become';
titleForDerivationStep[Conjugator.WordType.DE_ARU] = 'である Formal ・ Literary Copula';
titleForDerivationStep[Conjugator.WordType.TSUTSU_ARU] = 'つつある In The Process Of';
titleForDerivationStep[Conjugator.WordType.GATAI] = 'がたい Difficult To Do (Due To Emotional Reasons)';
titleForDerivationStep[Conjugator.WordType.SHIDAI] = '次第・しだい Immediately After';
titleForDerivationStep[Conjugator.WordType.YAGARU] = 'やがる Shows Contempt For The Action Being Done';
titleForDerivationStep[Conjugator.WordType.BEKU] = 'べく In Order To';

const linkForDerivationStep = {};
linkForDerivationStep[Conjugator.WordType.POLITE_MASU] = 'http://www.guidetojapanese.org/learn/grammar/polite#Not_being_rude_in_Japan';
linkForDerivationStep[Conjugator.WordType.POLITE_DESU_VERB] = 'http://www.guidetojapanese.org/learn/grammar/polite#Not_being_rude_in_Japan';
linkForDerivationStep[Conjugator.WordType.POLITE_MASEN] = 'http://www.guidetojapanese.org/learn/grammar/polite#Not_being_rude_in_Japan';
linkForDerivationStep[Conjugator.WordType.POLITE_MASEN_DESHITA] = 'http://www.guidetojapanese.org/learn/grammar/polite#Not_being_rude_in_Japan';
linkForDerivationStep[Conjugator.WordType.POLITE_MASHITA] = 'http://www.guidetojapanese.org/learn/grammar/polite#Not_being_rude_in_Japan';
linkForDerivationStep[Conjugator.WordType.POLITE_MASHOU] = 'http://www.guidetojapanese.org/learn/complete/desire_volition';
linkForDerivationStep[Conjugator.WordType.NEGATIVE_NAI_VERB] = 'http://www.guidetojapanese.org/learn/grammar/negativeverbs';
linkForDerivationStep[Conjugator.WordType.PLAIN_PAST] = 'http://www.guidetojapanese.org/learn/grammar/past_tense';
linkForDerivationStep[Conjugator.WordType.TE_FORM] = 'http://www.guidetojapanese.org/learn/grammar/compound#Expressing_a_sequence_of_verbs_with_the_te-form';
linkForDerivationStep[Conjugator.WordType.POTENTIAL] = 'http://www.guidetojapanese.org/learn/grammar/potential';
linkForDerivationStep[Conjugator.WordType.POTENTIAL_PASSIVE] = 'http://www.guidetojapanese.org/learn/grammar/causepass';
linkForDerivationStep[Conjugator.WordType.PASSIVE] = 'http://www.guidetojapanese.org/learn/grammar/causepass';
linkForDerivationStep[Conjugator.WordType.BA_FORM] = 'http://www.guidetojapanese.org/learn/grammar/conditionals';
linkForDerivationStep[Conjugator.WordType.IMPERATIVE] = 'http://www.guidetojapanese.org/learn/grammar/requests';
linkForDerivationStep[Conjugator.WordType.VOLITIONAL] = 'http://www.guidetojapanese.org/learn/complete/desire_volition';
linkForDerivationStep[Conjugator.WordType.MASU_STEM] = 'http://www.guidetojapanese.org/learn/grammar/polite#The_stem_of_verbs';
linkForDerivationStep[Conjugator.WordType.HEARSAY] = 'http://www.guidetojapanese.org/learn/grammar/similarity';
linkForDerivationStep[Conjugator.WordType.CAUSATIVE] = 'http://www.guidetojapanese.org/learn/grammar/causepass';
linkForDerivationStep[Conjugator.WordType.SHORTENED_CAUSATIVE] = 'http://www.guidetojapanese.org/learn/grammar/causepass';
linkForDerivationStep[Conjugator.WordType.TARA] = 'http://www.guidetojapanese.org/learn/grammar/conditionals';
linkForDerivationStep[Conjugator.WordType.NAKYA] = 'http://www.guidetojapanese.org/learn/grammar/must#Various_short-cuts_for_the_lazy';
linkForDerivationStep[Conjugator.WordType.NAKUCHA] = 'http://www.guidetojapanese.org/learn/grammar/must#Various_short-cuts_for_the_lazy';
linkForDerivationStep[Conjugator.WordType.AGEKU] = 'http://www.guidetojapanese.org/learn/grammar/other#Using_to_describe_a_bad_result';
linkForDerivationStep[Conjugator.WordType.TAI] = 'http://www.guidetojapanese.org/learn/grammar/desire#Verbs_you_want_to_do_with';
linkForDerivationStep[Conjugator.WordType.APPEARANCE] = 'http://www.guidetojapanese.org/learn/complete/appearance';
linkForDerivationStep[Conjugator.WordType.NAIDE] = 'http://www.guidetojapanese.org/learn/complete/inaction#Express_8220without_doing8221_with';
linkForDerivationStep[Conjugator.WordType.NA_COMMAND] = 'http://www.guidetojapanese.org/learn/grammar/requests';
linkForDerivationStep[Conjugator.WordType.NEGATIVE_VOLITIONAL] = 'http://www.guidetojapanese.org/learn/grammar/volitional2#Negative_Volitional';
linkForDerivationStep[Conjugator.WordType.NASAI] = 'http://www.guidetojapanese.org/learn/grammar/requests';
linkForDerivationStep[Conjugator.WordType.ZU] = 'http://www.guidetojapanese.org/learn/complete/inaction#Express_8220without_doing8221_with-2';
linkForDerivationStep[Conjugator.WordType.ADVERB] = 'http://www.guidetojapanese.org/learn/complete/adverbs';
linkForDerivationStep[Conjugator.WordType.WA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/particlesintro#The_topic_particle';
linkForDerivationStep[Conjugator.WordType.IRU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_for_enduring_states';
linkForDerivationStep[Conjugator.WordType.ARU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_for_resultant_states';
linkForDerivationStep[Conjugator.WordType.ORU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_for_enduring_states';
linkForDerivationStep[Conjugator.WordType.KUDASAI] = 'http://www.guidetojapanese.org/learn/grammar/requests';
linkForDerivationStep[Conjugator.WordType.NU] = 'http://www.guidetojapanese.org/learn/grammar/negativeverbs2#A_classical_negative_verb_that_ends_in';
linkForDerivationStep[Conjugator.WordType.FEMININE_WA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/sentence_ending#Gender-specific_sentence-ending_particles';
linkForDerivationStep[Conjugator.WordType.YO_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/adverbs#_sentence_ending';
linkForDerivationStep[Conjugator.WordType.NE_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/adverbs#_sentence_ending';
linkForDerivationStep[Conjugator.WordType.NA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/sentence_ending#_and_sentence-ending_particles';
linkForDerivationStep[Conjugator.WordType.ZO_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/sentence_ending#Gender-specific_sentence-ending_particles';
linkForDerivationStep[Conjugator.WordType.ZE_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/sentence_ending#Gender-specific_sentence-ending_particles';
linkForDerivationStep[Conjugator.WordType.KA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/question';
linkForDerivationStep[Conjugator.WordType.GA_PARTICLE] = 'http://www.guidetojapanese.org/learn/complete/conjunctions#Combining_two_sentences_with_8220but8221';
linkForDerivationStep[Conjugator.WordType.SA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/sentence_ending#_and_sentence-ending_particles';
linkForDerivationStep[Conjugator.WordType.MADE_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/verbparticles#The_target_particle';
linkForDerivationStep[Conjugator.WordType.KARA_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/verbparticles#The_target_particle';
linkForDerivationStep[Conjugator.WordType.KEDO_PARTICLE] = 'http://www.guidetojapanese.org/learn/complete/conjunctions#Combining_two_sentences_with_8220but8221';
linkForDerivationStep[Conjugator.WordType.NONI_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/compound#Using_to_mean_8220despite8221';
linkForDerivationStep[Conjugator.WordType.POLITE_DESHOU] = 'http://www.guidetojapanese.org/learn/grammar/certainty#Using_and_to_express_strong_amount_of_certainty_casual';
linkForDerivationStep[Conjugator.WordType.DAROU] = 'http://www.guidetojapanese.org/learn/grammar/certainty#Using_and_to_express_strong_amount_of_certainty_casual';
linkForDerivationStep[Conjugator.WordType.POLITE_ITADAKU] = 'http://www.guidetojapanese.org/learn/grammar/honorific';
linkForDerivationStep[Conjugator.WordType.MORAU] = 'http://www.guidetojapanese.org/favor.html#part4';
linkForDerivationStep[Conjugator.WordType.BEKI] = 'http://www.guidetojapanese.org/learn/grammar/should#Using_to_describe_actions_one_should_do';
linkForDerivationStep[Conjugator.WordType.OKU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_the_form_as_preparation_for_the_future';
linkForDerivationStep[Conjugator.WordType.KURERU] = 'http://www.guidetojapanese.org/learn/grammar/favors#When_to_use-2';
linkForDerivationStep[Conjugator.WordType.AGERU] = 'http://www.guidetojapanese.org/learn/grammar/favors#When_to_use';
linkForDerivationStep[Conjugator.WordType.WA_AFTER_TE] = 'http://japanesetest4you.com/flashcard/learn-jlpt-n2-grammar-%E3%81%A6%E3%81%AF-tewa/';
linkForDerivationStep[Conjugator.WordType.MO_AFTER_TE] = 'http://www.guidetojapanese.org/learn/complete/consequences#Asking_for_permission';
linkForDerivationStep[Conjugator.WordType.II] = undefined;
linkForDerivationStep[Conjugator.WordType.DA] = 'http://www.guidetojapanese.org/copula.html#part1';
linkForDerivationStep[Conjugator.WordType.OCCASIONAL_OCCURANCE_ARU] = 'http://japanesetest4you.com/flashcard/learn-jlpt-n3-grammar-%E3%81%93%E3%81%A8%E3%81%8C%E3%81%82%E3%82%8B-koto-ga-aru/';
linkForDerivationStep[Conjugator.WordType.EXPLANATORY_NO_PARTICLE] = 'http://www.guidetojapanese.org/learn/grammar/nounparticles#The_particle_as_explanation';
linkForDerivationStep[Conjugator.WordType.KOTO_NOMINALIZER] = 'http://www.guidetojapanese.org/genericnoun.html#part3';
linkForDerivationStep[Conjugator.WordType.KOTO_NI_SURU] = 'http://japanesetest4you.com/flashcard/learn-jlpt-n3-grammar-%E3%81%93%E3%81%A8%E3%81%AB%E3%81%99%E3%82%8B-koto-ni-suru/';
linkForDerivationStep[Conjugator.WordType.KOTO_NI_NARU] = 'http://japanesetest4you.com/flashcard/learn-jlpt-n3-grammar-%E3%81%93%E3%81%A8%E3%81%AB%E3%81%AA%E3%82%8B-koto-ni-naru/';
linkForDerivationStep[Conjugator.WordType.MAE] = 'http://www.guidetojapanese.org/learn/complete/verb_sequences#Before_and_after';
linkForDerivationStep[Conjugator.WordType.GA_HAYAI_KA] = 'http://www.jgram.org/pages/viewOne.php?tagE=gahayaika';
linkForDerivationStep[Conjugator.WordType.MITAI] = 'http://www.guidetojapanese.org/similar.html#part3';
linkForDerivationStep[Conjugator.WordType.RASHII] = 'http://www.guidetojapanese.org/similar.html#part6';
linkForDerivationStep[Conjugator.WordType.GARU] = 'http://www.guidetojapanese.org/signs.html#part2';
linkForDerivationStep[Conjugator.WordType.MASU_STEM_WA_SHINAI] = 'http://maggiesensei.com/2017/06/26/verb-%E2%86%92noun-%E3%80%9C%E3%81%AF%E3%81%97%E3%81%AA%E3%81%84-%E3%80%9C%E3%82%82%E3%81%97%E3%81%AA%E3%81%84-%E3%80%9C%E3%82%84%E3%81%97%E3%81%AA%E3%81%84-wa-shinai-mo-shinai-y/';
linkForDerivationStep[Conjugator.WordType.NAGARA] = 'http://www.guidetojapanese.org/timeaction2.html#part5';
linkForDerivationStep[Conjugator.WordType.GACHI] = 'http://www.guidetojapanese.org/learn/grammar/tendency#Saying_something_is_prone_to_occur_using';
linkForDerivationStep[Conjugator.WordType.KATA] = 'http://www.guidetojapanese.org/learn/grammar/comparison#Using_to_express_a_way_to_do_something';
linkForDerivationStep[Conjugator.WordType.NIKUI] = 'http://www.guidetojapanese.org/easyhard.html#part1';
linkForDerivationStep[Conjugator.WordType.YASUI] = 'http://www.guidetojapanese.org/easyhard.html#part1';
linkForDerivationStep[Conjugator.WordType.SUGI] = 'http://www.guidetojapanese.org/learn/grammar/amount#Saying_there8217s_too_much_of_something_using';
linkForDerivationStep[Conjugator.WordType.SUGIRU] = 'http://www.guidetojapanese.org/learn/grammar/amount#Saying_there8217s_too_much_of_something_using';
linkForDerivationStep[Conjugator.WordType.MASU_STEM_NI] = 'http://www.guidetojapanese.org/learn/grammar/polite#The_stem_of_verbs';
linkForDerivationStep[Conjugator.WordType.NAKUTE_NAKEREBA_IKENAI_NARANAI] = 'http://www.guidetojapanese.org/learn/grammar/must#Expressing_things_that_must_be_done';
linkForDerivationStep[Conjugator.WordType.TE_IKENAI_NARANAI] = 'http://www.guidetojapanese.org/learn/grammar/must#Using__and_for_things_that_must_not_be_done';
linkForDerivationStep[Conjugator.WordType.TE_DAME] = 'http://www.guidetojapanese.org/learn/grammar/must#Using__and_for_things_that_must_not_be_done';
linkForDerivationStep[Conjugator.WordType.NAKUTE_NAKEREBA_DAME] = 'http://www.guidetojapanese.org/learn/grammar/must#Expressing_things_that_must_be_done';
linkForDerivationStep[Conjugator.WordType.SHIMAU] = 'http://www.guidetojapanese.org/learn/grammar/unintended#Using_with_other_verbs';
linkForDerivationStep[Conjugator.WordType.CHAU] = 'http://www.guidetojapanese.org/learn/grammar/unintended#Using_the_casual_version_of';
linkForDerivationStep[Conjugator.WordType.MIRU] = 'http://www.guidetojapanese.org/learn/grammar/try#To_try_something_out';
linkForDerivationStep[Conjugator.WordType.HOSHII] = 'http://www.guidetojapanese.org/learn/grammar/desire#Indicating_things_you_want_or_want_done_using';
linkForDerivationStep[Conjugator.WordType.TE_KARA] = 'http://www.jgram.org/pages/viewOne.php?tagE=kara-2';
linkForDerivationStep[Conjugator.WordType.TE_KURU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_motion_verbs_with_the_te-form';
linkForDerivationStep[Conjugator.WordType.TE_IKU] = 'http://www.guidetojapanese.org/learn/grammar/teform#Using_motion_verbs_with_the_te-form';
linkForDerivationStep[Conjugator.WordType.KAMAU] = 'http://www.guidetojapanese.org/learn/grammar/must#Saying_something_is_ok_to_do_or_not_do';
linkForDerivationStep[Conjugator.WordType.SUMANAI] = 'https://www.japandict.com/%E6%B8%88%E3%81%BE%E3%81%AA%E3%81%84';
linkForDerivationStep[Conjugator.WordType.SUMIMASEN] = 'http://www.guidetojapanese.org/learn/grammar/honorific';
linkForDerivationStep[Conjugator.WordType.JIMAU] = 'http://www.guidetojapanese.org/learn/grammar/unintended#Using_the_casual_version_of';
linkForDerivationStep[Conjugator.WordType.CHIMAU] = 'http://www.guidetojapanese.org/learn/grammar/unintended#Using_the_casual_version_of';
linkForDerivationStep[Conjugator.WordType.JAU] = 'http://www.guidetojapanese.org/learn/grammar/unintended#Using_the_casual_version_of';
linkForDerivationStep[Conjugator.WordType.TARI] = 'http://www.guidetojapanese.org/learn/grammar/compound#Expressing_multiple_actions_or_states_using';
linkForDerivationStep[Conjugator.WordType.TA_BAKARI] = 'http://www.guidetojapanese.org/learn/grammar/timeactions#Expressing_what_just_happened_with';
linkForDerivationStep[Conjugator.WordType.HOU_GA_II] = 'http://www.guidetojapanese.org/learn/grammar/comparison#Using_for_comparisons';
linkForDerivationStep[Conjugator.WordType.YOU] = 'http://www.guidetojapanese.org/learn/complete/appearance';
linkForDerivationStep[Conjugator.WordType.HAZU] = 'http://www.guidetojapanese.org/learn/grammar/should#Using_to_describe_an_expectation';
linkForDerivationStep[Conjugator.WordType.NARU] = 'http://www.guidetojapanese.org/surunaru.html';
linkForDerivationStep[Conjugator.WordType.DE_ARU] = 'http://www.guidetojapanese.org/formal.html#part2';
linkForDerivationStep[Conjugator.WordType.TSUTSU_ARU] = 'http://www.guidetojapanese.org/tendency.html#part3';
linkForDerivationStep[Conjugator.WordType.GATAI] = 'http://www.guidetojapanese.org/learn/grammar/easyhard';
linkForDerivationStep[Conjugator.WordType.SHIDAI] = 'http://japanesetest4you.com/flashcard/learn-jlpt-n3-grammar-%E3%81%97%E3%81%A0%E3%81%84-shidai/';
linkForDerivationStep[Conjugator.WordType.YAGARU] = 'http://www.guidetojapanese.org/learn/grammar/slang#Showing_contempt_for_an_action_with';
linkForDerivationStep[Conjugator.WordType.BEKU] = 'http://www.guidetojapanese.org/learn/grammar/should#Using_to_describe_what_one_tries_to_do';

module.exports = {
  commandAliases: ['k!deconjugate', 'k!d'],
  shortDescription: 'Deconjugate a Japanese verb.',
  usageExample: 'k!deconjugate 食べさせられたかった',
  uniqueId: 'deconjugate35252',
  cooldown: 3,
  action(erisBot, monochrome, msg, suffix) {
    if (!suffix) {
      return throwPublicErrorInfo('Deconjugate', 'Say **k!deconjugate [verb]** to deconjugate a Japanese verb. For example: **k!deconjugate 食べさせられたかった**', 'No suffix');
    }

    if (suffix.length > 20) {
      throw PublicError.createWithCustomPublicMessage('Sorry, that\'s too long.', true, 'too long');
    }

    const results = Conjugator.unconjugate(suffix, true);
    if (results.length === 0) {
      throw PublicError.createWithCustomPublicMessage('I couldn\'t deconjugate that verb.', false, 'no results');
    }

    const bestResult = results[0];
    const sequence = bestResult.currentDerivationSequence;
    const path = bestResult.derivationPath;
    const baseWord = sequence.shift();
    const embed = {};
    embed.title = `Deconjugation of ${suffix}`;
    embed.color = constants.EMBED_NEUTRAL_COLOR;
    embed.description = `-\nStart with ${baseWord}\n\n`;
    for (let i = 0; i < sequence.length; i += 1) {
      if (linkForDerivationStep[path[i]]) {
        embed.description += `[**+ ${titleForDerivationStep[path[i]]}**](${linkForDerivationStep[path[i]]})`;
      } else {
        embed.description += `**+ ${titleForDerivationStep[path[i]]}**`;
      }
      embed.description += '\n';
      embed.description += `${sequence[i]}\n\n`;

      if (i === sequence.length - 1 && sequence[i] !== suffix) {
        embed.description += '+ Unknown\n';
        embed.description += suffix;
      }
    }

    embed.footer = { icon_url: constants.FOOTER_ICON_URI, text: 'This feature is in alpha. Please report bugs at https://discord.gg/zkAKbyJ' };
    return msg.channel.createMessage({ embed }, null, msg);
  },
};
