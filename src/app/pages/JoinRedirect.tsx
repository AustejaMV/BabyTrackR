import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";

export function JoinRedirect() {
  const { shortcode } = useParams<{ shortcode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (shortcode) {
      navigate(`/village/groups?join=${encodeURIComponent(shortcode)}`, { replace: true });
    } else {
      navigate("/village/groups", { replace: true });
    }
  }, [shortcode, navigate]);

  return null;
}
