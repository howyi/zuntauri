'use client'

import {isRegistered, register} from "@tauri-apps/api/globalShortcut";
import React, {useRef, useState} from "react";

const COPY_SHORTCUT = 'Alt+Z'

export default function Home() {
    const ref = useRef<HTMLInputElement>(null);
    const [text, setText] = useState('');

    const hide = React.useCallback(async () => {
        const {appWindow} = await import("@tauri-apps/api/window");
        await appWindow.hide();
    }, []);

    const setFocus = React.useCallback(async () => {
        const {appWindow} = await import("@tauri-apps/api/window");
        await appWindow.setFocus();
    }, []);


    const setShortcut = async () => {
        if (!(await isRegistered(COPY_SHORTCUT))) {
            await register(COPY_SHORTCUT, async () => {
                await setFocus();
                ref.current?.focus();
            })
        }
    }

    React.useEffect(() => {
        setShortcut().then()
    }, [])

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == 'Escape') {
            await hide();
            return
        }
        if (e.nativeEvent.isComposing || e.keyCode !== 13) return
        if (text == '') return

        // await navigator.mediaDevices.getUserMedia({audio: true});
        // chromeだとこれでオーディオデバイス一覧が取得できるが、tauriはsafariのWebViewを使用するため取得不可
        // const devices = await navigator.mediaDevices.enumerateDevices()
        // console.log(devices)

        const speaker = 1

        // http://localhost:50021/docs#/
        const res = await fetch(`http://localhost:50021/audio_query?text=${text}&speaker=${speaker}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            }
        })

        const query = await res.json()

        await hide();

        const sound_row = await fetch(`http://localhost:50021/synthesis?speaker=${speaker}&enable_interrogative_upspeak=true`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'accept': 'audio/wav',
                'responseType': "stream"
            },
            body: JSON.stringify(query)
        })

        const audiocontext = new AudioContext();
        const audioBuffer = await audiocontext.decodeAudioData(await (await sound_row.blob()).arrayBuffer());
        const source = audiocontext.createBufferSource();
        source.buffer = audioBuffer;
        console.log(audiocontext)
        source.connect(audiocontext.destination);
        setText('')

        source.start();
    }

    return (
        <main className="items-center justify-between">
            <input
                ref={ref}
                type="text"
                name="text"
                id="text"
                onKeyDown={handleKeyDown}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="block border-none text-2xl p-12 w-full bg-green-100 placeholder:text-gray-400"
                placeholder="こんにちは"
            />
        </main>
    )
}
