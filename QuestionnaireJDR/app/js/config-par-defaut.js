/*
 * config-par-defaut.js — GENERATED FILE, do not edit by hand.
 * Default configuration embedded in the application (browsers cannot read
 * local files without a user action).
 *
 * Regenerate after editing QuestionnaireJDR/configuration/*.yaml with:
 *     node dev/tools/build_default_config.mjs
 *
 * Generated on 2026-11-11T13:22:07.428Z.
 */
(function (root) {
  'use strict';
  root.QJ = root.QJ || {};
  root.QJ.DEFAULT_CONFIG = {
    "titre": "Questionnaire sur les profils-types de joueurs",
    "colonne_identifiant": "",
    "colonne_horodatage": "Horodateur",
    "attentes": [
      {
        "id": "competition",
        "nom": "Compétition",
        "couleur": "#D55E00",
        "titre": "Quel compétiteur êtes-vous ?",
        "description": "Cette attente mesure votre envie de gagner et de vous mesurer aux autres : goût du tournoi, suivi de la méta, optimisation des listes et plaisir de parader après une victoire bien méritée.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "Le pacifiste de la table",
            "texte": "Gagner ? Pourquoi pas, mais franchement ce n'est pas ce qui vous fait sortir vos figurines du placard. Le classement du tournoi régional vous laisse aussi froid qu'un jet de moral raté, et votre liste d'armée n'a jamais vu la couleur d'un forum d'optimisation. Vous jouez pour autre chose, et c'est très bien ainsi."
          },
          {
            "a_partir_de": 20,
            "titre": "Le challenger occasionnel",
            "texte": "Vous n'allez pas chercher la victoire à tout prix, mais quand elle passe à portée de charge, vous ne la laissez pas filer. Un petit tournoi « à la cool » de temps en temps vous tente, surtout s'il y a des potes et une bière à la clé. Vous savourez vos victoires sans en faire un drame quand elles vous échappent."
          },
          {
            "a_partir_de": 40,
            "titre": "Le général ambitieux",
            "texte": "Vous aimez gagner, et vous ne vous en cachez pas. Vous suivez la méta d'un œil attentif, vous peaufinez vos listes et une défaite sur un jet de dé chanceux de l'adversaire vous reste un peu en travers de la gorge. Les tournois vous attirent, mais vous gardez le sens de la mesure : la revanche attendra la semaine prochaine."
          },
          {
            "a_partir_de": 60,
            "titre": "Le tueur de méta",
            "texte": "Pour vous, un wargame sans victoire, c'est comme un codex sans règles : ça n'a aucun sens. Vous connaissez les listes du dernier tournoi par cœur, vous avez probablement déjà troqué vos motos adorées contre le tank qui marche, et un adversaire qui vous provoque signe son arrêt de mort sur table. Le podium est votre terrain de jeu naturel, et vos adversaires le savent."
          }
        ]
      },
      {
        "id": "strategie",
        "nom": "Stratégie",
        "couleur": "#0072B2",
        "titre": "Quel stratège êtes-vous ?",
        "description": "Cette attente mesure votre goût pour la réflexion et la profondeur tactique : planifier, anticiper, relever un défi équilibré et voir un plan mûrement réfléchi récompensé plutôt que la chance.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "Le général à l'instinct",
            "texte": "Planifier trois tours à l'avance ? Vous préférez voir ce que la partie vous réserve et improviser. Les ordres cachés et les mécaniques cérébrales vous semblent un peu superflus : une charge franche et un bon lancer de dés valent bien tous les diagrammes du monde. Votre armée avance, et on verra bien."
          },
          {
            "a_partir_de": 20,
            "titre": "Le tacticien du dimanche",
            "texte": "Vous appréciez un bon coup bien exécuté, mais vous ne passez pas vos nuits sur des tableaux de probabilités. Un scénario équilibré vous fait plaisir, un plan qui marche vous fait sourire, et quand il échoue, vous haussez les épaules. Pour vous, la réflexion est une épice, pas le plat principal."
          },
          {
            "a_partir_de": 40,
            "titre": "Le planificateur méthodique",
            "texte": "Vous aimez qu'une partie se gagne à la tête plutôt qu'au poignet. Les règles qui ouvrent des possibilités tactiques vous enchantent, les capacités qui échouent sur un 1 vous agacent, et un adversaire qui bavarde pendant votre phase de réflexion met vos nerfs à l'épreuve. Votre plus belle victoire est celle que vous aviez vue venir dès le déploiement."
          },
          {
            "a_partir_de": 60,
            "titre": "Le grand maître d'échecs",
            "texte": "Pour vous, la table de jeu est un échiquier géant où chaque centimètre et chaque activation comptent. Vous rêvez d'un wargame où le meilleur joueur gagne toujours, où les dés ne viendraient jamais ruiner un plan parfait, et vous êtes probablement en train de calculer les stats du système de bluff façon poker menteur qu'on vous a proposé. Vos adversaires ont intérêt à avoir bien dormi."
          }
        ]
      },
      {
        "id": "narration",
        "nom": "Narration",
        "couleur": "#CC79A7",
        "titre": "Quel conteur êtes-vous ?",
        "description": "Cette attente mesure votre plaisir à raconter des histoires autour de la table : scénarios maison, campagnes, armées à thème, anecdotes mémorables et petits héros improbables qui passent à la postérité.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "Le pragmatique sans légende",
            "texte": "Pourquoi votre armée combat-elle sur ce champ de bataille ? Aucune idée, et ça ne vous empêche pas de dormir. Vous n'inventez pas de biographie à votre seigneur de guerre et un scénario, pour vous, c'est avant tout une liste d'objectifs. Les belles histoires, vous les laissez volontiers aux autres."
          },
          {
            "a_partir_de": 20,
            "titre": "Le chroniqueur à ses heures",
            "texte": "Vous ne jouez pas pour l'histoire, mais quand un soldat de base terrasse un démon majeur, vous êtes le premier à le raconter au bar. Une armée à thème vous tente de temps en temps et un scénario avec un petit twist vous fait plaisir, tant que ça ne prend pas le pas sur la partie elle-même."
          },
          {
            "a_partir_de": 40,
            "titre": "Le barde des champs de bataille",
            "texte": "Chaque partie est pour vous un chapitre de plus dans la grande saga de votre armée. Vous commentez ce qui se passe sur table, vous imaginez les raisons d'un échec critique, et vous avez forcément une anecdote croustillante pour chaque figurine de votre vitrine. Une campagne maison avec des rebondissements ? Vous êtes déjà en train d'écrire le prologue."
          },
          {
            "a_partir_de": 60,
            "titre": "Le maître de campagne",
            "texte": "Pour vous, le wargame est une manière de se raconter des histoires, et les dés ne sont que des outils au service de l'intrigue. Vos tanks ont une raison tragique d'être là, votre seigneur de guerre a un nom, un passé et probablement une cicatrice, et un duel épique au dernier tour vaut mille points de victoire. Si le jeu de rôle n'existait pas, vous l'auriez inventé."
          }
        ]
      },
      {
        "id": "immersion",
        "nom": "Immersion",
        "couleur": "#009E73",
        "titre": "Quel bâtisseur d'univers êtes-vous ?",
        "description": "Cette attente mesure votre besoin de réalisme et de cohérence : respect du lore, règles qui simulent une vraie bataille, belles tables, vraies figurines et le sentiment de commander une armée plutôt que de déplacer des pions.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "Le touriste de l'univers",
            "texte": "Le lore, c'est joli, mais vous n'avez jamais lu les trois pages de background de votre codex et vous ne vous en portez pas plus mal. Des décors en carton ? Un tank qui ne colle pas à l'esprit de l'armée ? Tant que ça se joue bien, le reste est de la littérature. Vous pourriez probablement passer au dématérialisé sans regret."
          },
          {
            "a_partir_de": 20,
            "titre": "L'amateur de belles tables",
            "texte": "Vous appréciez une table bien installée et une armée peinte avec soin, même si vous ne refuseriez pas une partie sur un plateau tout nu. Le lore vous intéresse quand il est bon, sans que vous en fassiez une religion. Une règle un peu irréaliste vous fait tiquer, puis vous passez à autre chose."
          },
          {
            "a_partir_de": 40,
            "titre": "Le gardien du lore",
            "texte": "Pour vous, une unité dont les règles trahissent son histoire est une petite hérésie. Vous construisez vos listes en pensant d'abord à leur cohérence, vous défendez qu'une vraie armée n'agirait jamais comme ça, et un tournoi vous tente surtout pour y admirer de belles tables. Le jeu doit ressembler à une bataille, pas à un tableau Excel."
          },
          {
            "a_partir_de": 60,
            "titre": "Le général en immersion totale",
            "texte": "Quand vous jouez, vous n'êtes plus dans un garage : vous commandez une armée sur un vrai champ de bataille. Un wargame sans lore vous paraît la chose la plus farfelue du monde, le réalisme prime sur l'équilibrage, et jamais, jamais vous ne trahirez l'esprit de votre armée pour une unité à la mode. Vos figurines ont une âme, et vos tables aussi."
          }
        ]
      },
      {
        "id": "convivialite",
        "nom": "Convivialité",
        "couleur": "#E69F00",
        "titre": "Quel joueur social êtes-vous ?",
        "description": "Cette attente mesure l'importance que vous accordez au moment partagé : jouer entre potes, dans une bonne ambiance, sans se prendre trop au sérieux, et régler les petits désaccords d'un haussement d'épaules.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "Le solitaire concentré",
            "texte": "Vous venez pour jouer, pas pour discuter de la pluie et du beau temps. Un adversaire qui raconte sa semaine pendant votre phase de tir vous fait doucement bouillir, et si vos potes changent de jeu, eh bien vous en trouverez d'autres. Ce n'est pas de la froideur : vous prenez simplement la partie au sérieux."
          },
          {
            "a_partir_de": 20,
            "titre": "Le camarade de table",
            "texte": "Vous appréciez la compagnie, mais la partie passe avant la causerie. Une bonne ambiance est un plus appréciable, une mauvaise ambiance ne vous arrêtera pas forcément, et vous êtes capable de vous concentrer même quand le reste du club rigole autour de vous. Sociable, oui, mais avec un plan de bataille en tête."
          },
          {
            "a_partir_de": 40,
            "titre": "L'animateur de soirées",
            "texte": "Pour vous, le wargame est d'abord un bon moment entre potes. Vous répondez aux provocations en rigolant, vous acceptez l'interprétation de l'adversaire plutôt que de vous fâcher pour une règle, et si tout le monde passe à un nouveau jeu, vous suivez : l'important, c'est de jouer ensemble. Le joueur muet qui ne sourit jamais est votre seul vrai ennemi."
          },
          {
            "a_partir_de": 60,
            "titre": "L'âme du club",
            "texte": "Un wargame sans amis ? Voilà bien l'idée la plus absurde que vous ayez jamais entendue. Vous êtes le premier à remarquer qu'un pote s'énerve pour autre chose que ses dés, le premier à proposer une pause, et le dernier à partir. Votre liste d'armée est parfois faite de ce que vous aviez sous la main, mais votre table est toujours la plus joyeuse de la salle."
          }
        ]
      },
      {
        "id": "hasard",
        "nom": "Hasard",
        "couleur": "#56B4E9",
        "titre": "Quel lanceur de dés êtes-vous ?",
        "description": "Cette attente mesure votre goût pour l'imprévu : le frisson du jet de dé, les retournements de situation, la tension d'un dernier tour indécis et le joyeux chaos qui rend chaque partie unique.",
        "niveaux": [
          {
            "a_partir_de": 0,
            "titre": "L'ennemi juré du d6",
            "texte": "Les dés, pour vous, sont un mal nécessaire, voire une source de frustration pure. Un wargame sans hasard ne vous paraît pas farfelu du tout : ce serait même plutôt reposant. Quand la partie se joue sur un unique jet au dernier tour, vous ne retenez pas votre souffle, vous retenez surtout votre agacement."
          },
          {
            "a_partir_de": 20,
            "titre": "Le joueur prudent",
            "texte": "Vous acceptez le hasard comme on accepte la météo : il fait partie du jeu, mais vous préférez ne pas trop compter dessus. Un rebondissement inattendu vous amuse une fois de temps en temps, tant qu'il ne décide pas de toute la partie. Vous lancez vos dés sans les bénir ni les maudire."
          },
          {
            "a_partir_de": 40,
            "titre": "L'ami des dés",
            "texte": "Vous aimez ce petit moment de suspense avant que les dés ne s'immobilisent. Un soldat de base qui terrasse un démon majeur ? Ça, c'est le sel d'une partie ! Vous commentez vos jets avec enthousiasme, vous consolez les malchanceux en leur rappelant que ça fait partie du jeu, et vous misez volontiers sur votre bonne étoile pour compenser une liste un peu légère."
          },
          {
            "a_partir_de": 60,
            "titre": "Le parieur du chaos",
            "texte": "À quoi bon commencer une partie dont on connaît déjà l'issue ? Pour vous, le wargame est avant tout un jeu de dés, et c'est exactement ce qui le rend génial. Vous tranchez les désaccords de règles au d6, vous adorez les émotions d'un dernier tour qui se joue à pile ou face, et une activation tirée au hasard vous fait briller les yeux. Que le chaos soit avec vous."
          }
        ]
      }
    ],
    "questions": [
      {
        "id": "q01",
        "texte": "Concernant, les décors de votre champ de bataille, vous préférez...",
        "reponses": [
          {
            "texte": "... Jouer sur un layout proposé par le jeu afin qu’il soit bien équilibré.",
            "poids": {
              "strategie": 2,
              "competition": 1
            }
          },
          {
            "texte": "... Qu'ils soient installés pour faire une belle table.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "... Installer une mise en place qui raconte une histoire.",
            "poids": {
              "narration": 2,
              "immersion": 1
            }
          },
          {
            "texte": "... Ne pas vous prendre la tête avec ça. Tant que ça n’a pas l’air trop déséquilibré ça vous va.",
            "poids": {
              "convivialite": 2
            }
          }
        ]
      },
      {
        "id": "q02",
        "texte": "Dès le début de la partie, votre adversaire semble plus intéressé par discuter avec vous...",
        "reponses": [
          {
            "texte": "...Pas de soucis, c’est un bon pote et vous avez le temps.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "...Vous lui expliquez que vous voudriez faire une partie sérieuse.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "...Vous en profitez pour lui mettre une pâtée !",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "...Vous tentez de rediriger la conversation en commentant ce qui se passe sur table.",
            "poids": {
              "narration": 2
            }
          }
        ]
      },
      {
        "id": "q03",
        "texte": "Vous avez un désaccord sur une règle pendant une partie...",
        "reponses": [
          {
            "texte": "...Vous acceptez l’interprétation de votre adversaire. Ce serait bête de se fâcher pour ça.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "...Vous allez directement voir dans les règles.",
            "poids": {
              "competition": 2,
              "strategie": 1
            }
          },
          {
            "texte": "...Vous jouez ça aux dés.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "...Vous défendez l’idée que, dans une vraie bataille, une armée n’agirait jamais comme ça.",
            "poids": {
              "immersion": 2
            }
          }
        ]
      },
      {
        "id": "q04",
        "texte": "Le scénario de votre partie de jeu idéale...",
        "reponses": [
          {
            "texte": "...est un scénario maison avec des tonnes de rebondissements.",
            "poids": {
              "narration": 2,
              "hasard": 1
            }
          },
          {
            "texte": "...est un scénario qui reprend une bataille historique du lore.",
            "poids": {
              "immersion": 2,
              "narration": 1
            }
          },
          {
            "texte": "...est un scénario bien équilibré qui offre un défi intéressant pour votre armée.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "...le scénario le plus utilisé en tournoi actuellement.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q05",
        "texte": "Quand vous créez une nouvelle liste d’armée, vous pensez en priorité à...",
        "reponses": [
          {
            "texte": "...sa cohérence avec le lore.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "...ce qu’elle soit la mieux adaptée à la méta.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "...a une thématique particulière ou à une unité que vous avez envie de jouer.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "...rien. Vous prenez une liste sur le net ou vous prenez les unités que vous avez sous la main.",
            "poids": {
              "convivialite": 2
            }
          }
        ]
      },
      {
        "id": "q06",
        "texte": "Vous avez clairement mieux joué que votre adversaire mais il a eu une chance insolente aux dés.",
        "reponses": [
          {
            "texte": "Ça fera une super anecdote à raconter !",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "On n’y peut rien même si ça ne devrait pas arriver.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Pas grave, vous aussi vous misez souvent sur votre chance !",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Vous avez le seum.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q07",
        "texte": "Les capacités qui ont 1 chance sur 6 d’échouer, vous en pensez quoi ?",
        "reponses": [
          {
            "texte": "Elles devraient s’activer automatiquement.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Vous aimez bien imaginer les raisons de ces échecs.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "C’est normal, dans la vraie vie même un plan parfaitement exécuté peut échouer.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Ça ajoute du sel et de la tension !",
            "poids": {
              "hasard": 2
            }
          }
        ]
      },
      {
        "id": "q08",
        "texte": "Le wargame, pour vous, c’est...",
        "reponses": [
          {
            "texte": "Une manière de vous mesurer à d’autres.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Avant tout un jeu de dé.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Un bon moment entre potes.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Une manière de se raconter des histoires.",
            "poids": {
              "narration": 2
            }
          }
        ]
      },
      {
        "id": "q09",
        "texte": "Un nouveau joueur n’arrête pas de vous provoquer en affirmant qu’il est meilleur que vous.",
        "reponses": [
          {
            "texte": "Vous allez lui rendre la monnaie de sa pièce sur table.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Vous répondez à ses provocations en rigolant.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Vous vous moquez de ses provocations (par contre, il a intérêt à être bon sur table).",
            "poids": {
              "strategie": 1,
              "competition": 1
            }
          },
          {
            "texte": "Vous ne jouez plus avec lui. Jouer pour la gagne, c’est pas pour vous.",
            "poids": {
              "convivialite": 1,
              "narration": 1
            }
          }
        ]
      },
      {
        "id": "q10",
        "texte": "Pour vous le but du jeu, c’est...",
        "reponses": [
          {
            "texte": "De gagner.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "De se marrer.",
            "poids": {
              "convivialite": 2,
              "hasard": 1
            }
          },
          {
            "texte": "D’avoir l’impression de vivre une vraie bataille.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Etablir une stratégie et réussir de super coups.",
            "poids": {
              "strategie": 2
            }
          }
        ]
      },
      {
        "id": "q11",
        "texte": "Pour vous les dés, c’est surtout...",
        "reponses": [
          {
            "texte": "Une source de frustration.",
            "poids": {
              "strategie": 1,
              "competition": 1
            }
          },
          {
            "texte": "Une manière de créer des situations uniques.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Du chaos qu’il faut apprendre à maîtriser.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Quelque chose qui amène du fun dans les parties.",
            "poids": {
              "hasard": 2
            }
          }
        ]
      },
      {
        "id": "q12",
        "texte": "Avec quel type de joueurs vous ne supportez pas de jouer ?",
        "reponses": [
          {
            "texte": "Celui qui interrompt la partie toutes les cinq minutes pour parler de sa vie.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Le joueur muet qui ne décroche pas un sourire de toute la partie.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Le joueur qui va se servir de tous les tricks de jeux possibles pour gagner.",
            "poids": {
              "immersion": 1,
              "convivialite": 1
            }
          },
          {
            "texte": "Le joueur dont “l’armée de coeur” est toujours au top de la méta.",
            "poids": {
              "narration": 2
            }
          }
        ]
      },
      {
        "id": "q13",
        "texte": "Parmi ces exemples, la meilleure partie serait :",
        "reponses": [
          {
            "texte": "Une partie très tactique mais qui ne respecte pas du tout le lore.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Une partie pleines de surprises mais où tout c’est joué sur les dés.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Une partie très scénarisée mais sans aucun challenge stratégique.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Une partie simulant parfaitement le siège d’un château mais où l’attaquant n’avait pratiquement aucune chance de gagner.",
            "poids": {
              "immersion": 2
            }
          }
        ]
      },
      {
        "id": "q14",
        "texte": "Vous jouez une partie très serrée qui se résout au dernier tour sur un unique jet de dé.",
        "reponses": [
          {
            "texte": "Frustrant. Le jeu aurait dû récompenser le meilleur joueur.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Ce sera une bonne partie si la chance est avec vous !",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Vous adorez les émotions créées par ces moments-là !",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Si la partie se finit sur un duel de seigneur, super ! Si c'est juste un test de moral d’une unité à moitié crevée, bof.",
            "poids": {
              "narration": 2
            }
          }
        ]
      },
      {
        "id": "q15",
        "texte": "Vous jouez une armée de motos mais la meilleure unité de votre codex est un tank qui se traîne...",
        "reponses": [
          {
            "texte": "Vous abandonnez vos motos pour jouer ce qui marche.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Jamais de la vie vous ne trahirez l’esprit de votre armée !",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Vous inventez une histoire tragique pour expliquer la présence de ces tanks dans votre armée.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Vous comptez sur votre chance pour compenser la relative faiblesse de vos motos.",
            "poids": {
              "hasard": 2
            }
          }
        ]
      },
      {
        "id": "q16",
        "texte": "Tous vos potes se mettent à un nouveau wargame que vous n’aimez pas plus que ça.",
        "reponses": [
          {
            "texte": "Pas grave. L’important c’est que vous aimiez jouer avec eux.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Il paraît qu’il y a une asso dans la ville d’à côté...",
            "poids": {
              "strategie": 1,
              "competition": 1
            }
          },
          {
            "texte": "Vous créez une campagne en modifiant les règles à votre convenance.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Vous vous vengez en allant chercher la liste la plus puissante sur internet.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q17",
        "texte": "On vous propose un tournoi...",
        "reponses": [
          {
            "texte": "Un week-end normal quoi.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "C'est non. Vous préférez jouer entre potes.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Si on vous promet une rencontre “à la cool”, pourquoi pas.",
            "poids": {
              "convivialite": 1,
              "hasard": 1
            }
          },
          {
            "texte": "Si c’est l’occasion de voir de belles tables et de belles armées...",
            "poids": {
              "immersion": 2
            }
          }
        ]
      },
      {
        "id": "q18",
        "texte": "Vous seriez prêt à commencer un nouveau wargame si...",
        "reponses": [
          {
            "texte": "Tous vos potes joueurs s’y mettaient aussi.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Son lore est incroyable.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Ses mécaniques de jeu sont intéressantes et innovantes.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Sa scène compétitive est accueillante et bien installée.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q19",
        "texte": "Une nouvelle unité est sortie pour votre armée mais ses règles ne correspondent pas à son lore.",
        "reponses": [
          {
            "texte": "Vous ne la jouerez pas avant la sortie d’un nouveau codex.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Si elle est forte, ça ne vous dérange pas.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Si elle est fun à jouer, il est où le problème ?",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Vous la prendrez si elle remplit une fonction stratégique qui manquait dans l’armée.",
            "poids": {
              "strategie": 2
            }
          }
        ]
      },
      {
        "id": "q20",
        "texte": "Si vous ne pouviez plus jouer qu'en dématérialisé, qu'est-ce qui vous manquerait le plus ?",
        "reponses": [
          {
            "texte": "Les interactions sociales.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Lancer les dés et commenter les résultats.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Les figurines réelles.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Pouvoir parader après sa victoire.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q21",
        "texte": "Pour vous l’équilibrage c’est...",
        "reponses": [
          {
            "texte": "L’élément primordial sur lequel l’éditeur d’un jeu doit travailler.",
            "poids": {
              "competition": 1,
              "strategie": 1
            }
          },
          {
            "texte": "Pas si important. Au pire, on le corrige entre nous.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Moins important que le fait que les fiches d’unité collent au lore.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Un problème de joueurs de tournoi.",
            "poids": {
              "narration": 1,
              "convivialite": 1
            }
          }
        ]
      },
      {
        "id": "q22",
        "texte": "Une bonne règle de base, c’est d’abord...",
        "reponses": [
          {
            "texte": "Une règle qui crée des rebondissements inattendus.",
            "poids": {
              "hasard": 2,
              "narration": 1
            }
          },
          {
            "texte": "Une règle qui ouvre des possibilités stratégiques.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Une règle qui représente au mieux ce qui se passe sur un champ de bataille.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Une règle simple pour éviter les discussions interminables.",
            "poids": {
              "convivialite": 2
            }
          }
        ]
      },
      {
        "id": "q23",
        "texte": "Pour vous, un bon wargame doit-il laisser la possibilité à un soldat de base de tuer un démon majeur ?",
        "reponses": [
          {
            "texte": "Oui, ça permet de construire une histoire autour de ce fait d’arme.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Oui, ce genre de rebondissement fait le sel d’une partie.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Non, le jeu ne devrait pas laisser un jet de dé détruire une stratégie.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Non, ça manque de réalisme.",
            "poids": {
              "immersion": 2
            }
          }
        ]
      },
      {
        "id": "q24",
        "texte": "Quelle est l’émotion que vous aimez le plus ressentir quand vous jouez ?",
        "reponses": [
          {
            "texte": "Le frisson du hasard.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "L’immersion dans un univers de fiction.",
            "poids": {
              "immersion": 2,
              "narration": 1
            }
          },
          {
            "texte": "Voir un plan mûrement réfléchi réussir.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Le sentiment d’avoir été plus fort que votre adversaire.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q25",
        "texte": "Quel est le pire adversaire sur lequel vous pourriez tomber ?",
        "reponses": [
          {
            "texte": "Le chanceux qui ne fait que des six pendant toute la partie.",
            "poids": {
              "strategie": 1,
              "competition": 1
            }
          },
          {
            "texte": "Le mauvais joueur qui se plaint de tout et de rien.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "L’optimisateur qui joue une liste top méta et connaît tous les tricks de jeux.",
            "poids": {
              "narration": 1,
              "immersion": 1
            }
          },
          {
            "texte": "Le débutant qui ne connaît pas la moitié des règles.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q26",
        "texte": "Quel autre type de jeu vous attire le plus ? (Ou pratiquez-vous déjà).",
        "reponses": [
          {
            "texte": "Les jeux d’ambiance.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Les jeux de rôle.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Les jeux de gestion.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Les jeux multijoueurs en ligne.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q27",
        "texte": "L’extension idéale pour votre wargame ?",
        "reponses": [
          {
            "texte": "Un décor de campagne.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Une grosse mise à jour avec rééquilibrage de toutes les factions.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Des règles pour customiser ses armées.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Un nouveau mode de jeu qui approfondirait l’aspect stratégique des parties.",
            "poids": {
              "strategie": 2
            }
          }
        ]
      },
      {
        "id": "q28",
        "texte": "Un de vos amis, d’habitude calme, s’énerve de son manque de chance durant sa partie.",
        "reponses": [
          {
            "texte": "Vous interrompez la partie pour vérifier qu’il n’est pas en colère pour autre chose.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "Vous essayez de lui expliquer que la (mal)chance fait aussi partie du jeu.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Vous le comprenez tout à fait, surtout qu’il jouait bien.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "Vous en profitez. La semaine dernière c’était vous qui n’aviez pas de chance.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q29",
        "texte": "Laquelle de ces mécaniques vous aimeriez bien tester dans un wargame ?",
        "reponses": [
          {
            "texte": "Avoir un seigneur de guerre entièrement personnalisable.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "Programmer des ordres cachés à vos unités au début de chaque tour.",
            "poids": {
              "strategie": 2
            }
          },
          {
            "texte": "L’ordre d’activation des unités est tiré au hasard.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Le perdant doit payer une bière, un soda, un café au gagnant.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q30",
        "texte": "Laquelle de ses propositions vous paraît la plus farfelue.",
        "reponses": [
          {
            "texte": "Un wargame sans hasard.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Un wargame sans lore.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "Un wargame sans victoire.",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Un wargame sans amis.",
            "poids": {
              "convivialite": 2
            }
          }
        ]
      },
      {
        "id": "q31",
        "texte": "A quoi bon commencer la partie si...",
        "reponses": [
          {
            "texte": "L’ambiance n’est pas bonne.",
            "poids": {
              "convivialite": 2
            }
          },
          {
            "texte": "On en connaît déjà l’issue.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "On ne nous a pas expliqué pourquoi notre armée combat sur ce champ de bataille.",
            "poids": {
              "narration": 2
            }
          },
          {
            "texte": "On sait déjà que l’adversaire ne sera pas à la hauteur.",
            "poids": {
              "competition": 2
            }
          }
        ]
      },
      {
        "id": "q32",
        "texte": "On vous propose un wargame ambiance Western dans lequel les dés sont remplacés par un système de bluff façon poker menteur.",
        "reponses": [
          {
            "texte": "Trop bien, il faut mentir pour gagner !",
            "poids": {
              "competition": 2
            }
          },
          {
            "texte": "Ça colle bien au thème.",
            "poids": {
              "immersion": 2
            }
          },
          {
            "texte": "C’est dommage d’enlever l’aléa.",
            "poids": {
              "hasard": 2
            }
          },
          {
            "texte": "Les stats doivent être dures à faire...",
            "poids": {
              "strategie": 2
            }
          }
        ]
      }
    ],
    "rapport": {
      "titre_rapport_individuel": "Votre profil de joueur",
      "introduction": "Vous avez répondu au questionnaire sur les profils-types de joueurs de wargame : voici ce que vos réponses racontent de vous. Le graphique en radar montre votre score pour chacune des {nombre_attentes} attentes ludiques ; chaque score correspond au pourcentage de points obtenus par rapport au maximum possible pour cette attente (de 0 à 100). Il n'y a ni bon ni mauvais profil : il s'agit simplement de mettre des mots sur ce que vous venez chercher autour d'une table.",
      "titre_profil_dominant": "Votre attente principale",
      "texte_profil_mixte": "Plusieurs attentes arrivent à égalité en tête de votre profil : vous êtes un joueur aux multiples facettes, qui apprécie une partie pour plusieurs raisons à la fois.",
      "conclusion": "Ce profil n'est qu'une photographie de vos réponses à un instant donné, et il évoluera sans doute au fil de vos parties. Servez-vous-en pour trouver les joueurs, les scénarios et les formats qui vous feront le plus plaisir, et surtout, bon jeu !",
      "pied_de_page": "Rapport généré à partir du questionnaire « Questionnaire sur les profils-types de joueurs ».",
      "titre_rapport_global": "Synthèse des réponses",
      "introduction_rapport_global": "Ce rapport rassemble l'ensemble des réponses reçues au questionnaire et présente, pour chaque attente ludique, la répartition des scores et des niveaux atteints par les répondants. Il permet de repérer d'un coup d'œil les tendances de votre communauté de joueurs et de comparer les profils individuels à la moyenne du groupe."
    }
  };
})(typeof self !== 'undefined' ? self : this);
