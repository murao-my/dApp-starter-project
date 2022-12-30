import React, { useEffect, useState } from "react";
import "./App.css";
import { ethers } from "ethers";
import abi from "./utils/WavePortal.json";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [allWaves, setAllWaves] = useState([]);
  //ユーザーのメッセージを保存するために使用する状態変数を定義
  const [messageValue, setMessageValue] = useState("");

  const contractAddress = "0x0FCb50d55FC87A61DF594fC13FAbe7f779c2451C";
  const contractABI = abi.abi;
  //  window.ethereumにアクセスできることを確認します。
  const checkIfWalletsIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      /* ユーザーのウォレットへのアクセスが許可されているかどうかを確認します */
      // eth_accountsは、空の配列または単一のアカウントアドレスを含む配列を返す特別なメソッド
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
        getAllWaves();
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get Metamask");
        return;
      }
      // 持っている場合は、ユーザーに対してウォレットへのアクセス許可を求める。
      // 許可されれば、ユーザーの最初のウォレットアドレスを currentAccount に格納する。
      // eth_requestAccounts関数を使用することで、MetaMaskからユーザーにウォレットへのアクセスを許可するよう呼びかける
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const wave = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        //ethereum nodeに接続するプロバイダーを設定
        const provider = new ethers.providers.Web3Provider(ethereum);
        //signer:ウォレットアドレスの抽象化
        //provider.getSigner()：ウォレットアドレスを使用してトランザクションに署名し、そのデータをイーサリアムネットワークに送信する
        const signer = provider.getSigner();
        //contractへの接続
        //providerを渡すと読み取り専用インスタンス
        //signerを渡すと読み取りと書き込み可能なインスタンス
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        let contractBalance = await provider.getBalance(
          wavePortalContract.address
        );
        console.log(
          "Contract balance:",
          ethers.utils.formatEther(contractBalance)
        );
        console.log("Signer:", signer);

        const waveTxn = await wavePortalContract.wave(messageValue, {
          gasLimit: 300000,
        });
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
        );
        // コントラクトの残高が減っていることを確認
        if (contractBalance_post.lt(contractBalance)) {
          // 減っていたら下記を出力
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
        );
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getAllWaves = async () => {
    const { ethereum } = window;
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          provider
        );
        const waves = await wavePortalContract.getAllWaves();
        // UIに必要なのは、アドレス、タイムスタンプ、メッセージだけなので、以下のように設定
        const wavesCleaned = waves.map((wave) => {
          return {
            sender: wave.sender,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });
        //React Stateにデータを格納する
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    checkIfWalletsIsConnected();
  }, []);
  useEffect(() => {
    let wavePortalContract;

    // const onNewWave = (from, timestamp, message) => {
    const onNewWave = (from, message, timestamp) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          sender: from,
          message: message,
          timestamp: new Date(timestamp * 1000),
        },
      ]);
    };
    // NewWaveイベントがコントラクトから発信されたときに、情報を受け取る
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      wavePortalContract.on("NewWave", onNewWave);
    }
    // メモリリークを防ぐために、NewWaveのイベントを解除
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);
  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
          <span role="img" aria-label="hand-wave">
            👋
          </span>{" "}
          WELCOME!
        </div>

        <div className="bio">
          イーサリアムウォレットを接続して、「
          <span role="img" aria-label="hand-wave">
            👋
          </span>
          (Wave)」を送ってください
          <span role="img" aria-label="shine">
            ✨
          </span>
        </div>

        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect wallet
          </button>
        )}
        {currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Wallet Connected
          </button>
        )}
        {currentAccount && (
          <button className="waveButton" onClick={wave}>
            Wave at Me
          </button>
        )}
        {/* messageBOX */}
        {currentAccount && (
          <textarea
            name="messageArea"
            placeholder="メッセージはこちら"
            type="text"
            id="message"
            value={messageValue}
            onChange={(e) => {
              setMessageValue(e.target.value);
            }}
          />
        )}
        {/* イベント表示 */}
        {currentAccount &&
          allWaves
            .slice(0)
            .reverse()
            .map((wave, index) => {
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F8F8FF",
                    marginTop: "16px",
                    padding: "8px",
                  }}
                >
                  <div>Address: {wave.sender}</div>
                  <div>Time: {wave.timestamp.toString()}</div>
                  <div>Message: {wave.message.toString()}</div>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default App;
