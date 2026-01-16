(function() {
  'use strict';

  // Configuration
  const API_BASE_URL = 'https://your-domain.vercel.app'; // Replace with actual domain
  const API_ENDPOINT = '/api/bookmarklet/submit';

  // Check if bookmarklet is disabled
  const BOOKMARKLET_ENABLED = true; // Can be toggled to disable

  if (!BOOKMARKLET_ENABLED) {
    alert('GCM Arena: ブックマークレット機能は現在停止中です');
    return;
  }

  /**
   * Extract score data from ONGEKI official site
   */
  function extractOngekiScore() {
    try {
      // Example DOM structure - adjust based on actual site structure
      const scoreElement = document.querySelector('.score-value');
      const titleElement = document.querySelector('.music-title');
      const difficultyElement = document.querySelector('.difficulty');

      if (!scoreElement || !titleElement) {
        throw new Error('スコア情報が見つかりません');
      }

      const score = parseInt(scoreElement.textContent.replace(/,/g, ''), 10);
      const title = titleElement.textContent.trim();
      const difficulty = difficultyElement ? difficultyElement.textContent.trim() : 'master';

      return {
        game_type: 'ongeki',
        score,
        song_title: title,
        difficulty,
      };
    } catch (error) {
      throw new Error('ONGEKI: ' + error.message);
    }
  }

  /**
   * Extract score data from CHUNITHM official site
   */
  function extractChunithmScore() {
    try {
      // Example DOM structure - adjust based on actual site structure
      const scoreElement = document.querySelector('.play_musicdata_score_text');
      const titleElement = document.querySelector('.play_musicdata_title');
      const difficultyElement = document.querySelector('.play_track_result img');

      if (!scoreElement || !titleElement) {
        throw new Error('スコア情報が見つかりません');
      }

      const score = parseInt(scoreElement.textContent.replace(/,/g, ''), 10);
      const title = titleElement.textContent.trim();
      const difficulty = difficultyElement ? difficultyElement.alt : 'master';

      return {
        game_type: 'chunithm',
        score,
        song_title: title,
        difficulty,
      };
    } catch (error) {
      throw new Error('CHUNITHM: ' + error.message);
    }
  }

  /**
   * Extract score data from maimai official site
   */
  function extractMaimaiScore() {
    try {
      // Example DOM structure - adjust based on actual site structure
      const scoreElement = document.querySelector('.playlog_achievement_txt');
      const titleElement = document.querySelector('.playlog_music_title');
      const difficultyElement = document.querySelector('.playlog_diff');

      if (!scoreElement || !titleElement) {
        throw new Error('スコア情報が見つかりません');
      }

      const scoreText = scoreElement.textContent.replace(/,/g, '').replace('%', '');
      const score = Math.round(parseFloat(scoreText) * 10000); // Convert percentage to score
      const title = titleElement.textContent.trim();
      const difficulty = difficultyElement ? difficultyElement.textContent.trim() : 'master';

      return {
        game_type: 'maimai',
        score,
        song_title: title,
        difficulty,
      };
    } catch (error) {
      throw new Error('maimai: ' + error.message);
    }
  }

  /**
   * Detect game type from current URL
   */
  function detectGameType() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname.includes('ongeki') || pathname.includes('ongeki')) {
      return 'ongeki';
    } else if (hostname.includes('chunithm') || pathname.includes('chunithm')) {
      return 'chunithm';
    } else if (hostname.includes('maimai') || pathname.includes('maimai')) {
      return 'maimai';
    }

    return null;
  }

  /**
   * Extract score data based on detected game type
   */
  function extractScoreData() {
    const gameType = detectGameType();

    if (!gameType) {
      throw new Error('対応していないページです。公式ゲームサイトで実行してください。');
    }

    switch (gameType) {
      case 'ongeki':
        return extractOngekiScore();
      case 'chunithm':
        return extractChunithmScore();
      case 'maimai':
        return extractMaimaiScore();
      default:
        throw new Error('未対応のゲームタイプです');
    }
  }

  /**
   * Find matching song in tournament
   */
  async function findMatchingSong(scoreData, tournamentId) {
    try {
      // Get tournament songs
      const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('大会情報の取得に失敗しました');
      }

      const tournament = await response.json();

      // Find matching song by title and difficulty
      const matchingSong = tournament.songs?.find(song => 
        song.title === scoreData.song_title &&
        song.difficulty === scoreData.difficulty
      );

      if (!matchingSong) {
        throw new Error('この楽曲は大会の対象ではありません');
      }

      return matchingSong.id;
    } catch (error) {
      throw new Error('楽曲の照合に失敗しました: ' + error.message);
    }
  }

  /**
   * Submit score to API
   */
  async function submitScore(scoreData, tournamentId, songId) {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tournament_id: tournamentId,
          song_id: songId,
          score: scoreData.score,
          game_type: scoreData.game_type,
          song_title: scoreData.song_title,
          difficulty: scoreData.difficulty,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'スコアの提出に失敗しました');
      }

      return result;
    } catch (error) {
      throw new Error('API通信エラー: ' + error.message);
    }
  }

  /**
   * Main execution
   */
  async function main() {
    try {
      // Show loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'gcm-arena-loading';
      loadingDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#333;color:#fff;padding:15px;border-radius:5px;z-index:10000;font-family:sans-serif;';
      loadingDiv.textContent = 'GCM Arena: スコアを抽出中...';
      document.body.appendChild(loadingDiv);

      // Extract score data from page
      const scoreData = extractScoreData();
      loadingDiv.textContent = 'GCM Arena: スコアを送信中...';

      // Prompt user for tournament ID
      const tournamentId = prompt('大会IDを入力してください:');
      if (!tournamentId) {
        throw new Error('大会IDが入力されませんでした');
      }

      // Find matching song
      const songId = await findMatchingSong(scoreData, tournamentId);

      // Submit score
      const result = await submitScore(scoreData, tournamentId, songId);

      // Show success message
      document.body.removeChild(loadingDiv);
      alert(`GCM Arena: ${result.message}\nスコア: ${scoreData.score}`);

    } catch (error) {
      // Remove loading indicator
      const loadingDiv = document.getElementById('gcm-arena-loading');
      if (loadingDiv) {
        document.body.removeChild(loadingDiv);
      }

      // Show error message
      alert('GCM Arena エラー:\n' + error.message);
      console.error('GCM Arena Bookmarklet Error:', error);
    }
  }

  // Execute main function
  main();
})();
