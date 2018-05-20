gameJoiner = new Vue({
  el: '#gameJoiner',
  data: {
    socket: io(),
    currentGameInfos: [],
  },
});

function joinGame() {
  gameJoiner.socket.emit('request games');
  return false;
}

gameJoiner.socket.on('current games', function(data) {
  gameJoiner.currentGameInfos = data.map(element => {
    return {
      uri: '/game.html?id=' + element.roomId,
      creatorName: element.creatorName,
      decks: element.decks,
    }
  });
  $('#currentGamesModal').modal('show');
});
