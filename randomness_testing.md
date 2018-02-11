# Randomness testing

Some users brought to my attention that the questions presented by Kotoba may not be as random as they should be. Users noticed this while playing games to high score limits (often 50 or 100). They said that the same questions seemed to appear every day.

## Hypothesis

The hypothesis that I would like to prove or disprove here is: when playing repeated games with score limits of 100, questions repeat themselves in ways that can NOT be explained by discrete mathematics as mere coincidence.

## The math

In this test I am going to be working with the following scenario, which should be similar to the actual scenario that is the reason for this testing: 5 N1 games are run in a row, and in each game 100 questions are shown.

The N1 deck contains 1770 questions, and questions are not repeated within a game.

### How often should one question appear?

Assume that a question is one of the questions that appeared in the first game. What is the mathematical chance that it will also appear in the second game?

In the second game, like the first, 100 questions are chosen, and 1670 are not. Therefore, the question has a 100/1770, or 5.65% chance of appearing in the second game. And a 1670/1770, or %94.35 chance of not appearing.

It has the same chances of appearing or not appearing also in each of the third, fourth, and fifth games.

From this we can say that:

Chance of appearing in 5/5 games = (100/1770)^4 = **.001%**  
Chance of appearing in 4/5 games = (1670/1770)^1 * (100/1770)^3 * (4 choose 1) = **.07%**  
Chance of appearing in 3/5 games = (1670/1770)^2 * (100/1770)^2 * (4 choose 2) = **1.7%**  
Chance of appearing in 2/5 games = (1670/1770)^3 * (100/1770)^1 * (4 choose 1) = **19%**  
Chance of appearing in 1/5 games = (1670/1770)^4 = **79.2%**  

->

The chance of appearing in 1 or more games = **100%**  
The chance of appearing in 2 or more games = (100/1770)^4 + (1670/1770)^1 * (100/1770)^3 * (4 choose 1) + (1670/1770)^2 * (100/1770)^2 * (4 choose 2) + (1674/1770)^3 * (100/1770)^1 * (4 choose 1) = **20.9%**  
The chance of appearing in 3 or more games = (100/1770)^4 + (1670/1770)^1 * (100/1770)^3 * (4 choose 1) + (1670/1770)^2 * (100/1770)^2 * (4 choose 2) = **1.8%**  
The chance of appearing in 4 or more games = (100/1770)^4 + (1670/1770)^1 * (100/1770)^3 * (4 choose 1) = **.07%**  
The chance of appearing in 5 or more games = (100/1770)^4 = **.001%**  

What is the chance that at least one question in the first game appears in all 5 of the games?

1 - (1 - (100/1774)^4)^100 = **.1%**

What is the chance that at least one question in the first game appears in 4 or more of the 5 games?

1 - (1 - ((100/1774)^4 + (1674/1774)^1 * (100/1774)^3 * (4 choose 1)))^100 = **6.6%**

What is the chance that at least one question in the first game appears in 3 or more of the 5 games?

1 - (1 - ((100/1774)^4 + (1674/1774)^1 * (100/1774)^3 * (4 choose 1) + (1674/1774)^2 * (100/1774)^2 * (4 choose 2)))^100 = **83.2%**