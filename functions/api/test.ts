export const onRequest = () => {
  return new Response(JSON.stringify({ status: 'ok', message: 'Direct function works!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
